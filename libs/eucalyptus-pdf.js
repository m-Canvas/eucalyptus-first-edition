/* Eucalyptus local PDF generator
 * No CDN or external network dependency.
 * Creates a PDF from JPEG byte arrays, one image per A4 page.
 */
(function (global) {
  "use strict";

  const A4_WIDTH_PT = 595.275590551;
  const A4_HEIGHT_PT = 841.88976378;

  function ascii(text) {
    return new TextEncoder().encode(text);
  }

  function concatBytes(parts) {
    let total = 0;
    for (const part of parts) total += part.length;
    const result = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }

  function pdfEscape(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function createPdf(jpegPages, options) {
    options = options || {};
    const qualityLabel = options.title || "Eucalyptus — First Edition";
    const objects = [];
    const pageObjectNumbers = [];
    const contentObjectNumbers = [];
    const imageObjectNumbers = [];

    // Object 1 = catalog, 2 = pages root.
    objects[1] = ascii("<< /Type /Catalog /Pages 2 0 R >>");
    objects[2] = null;

    let nextObject = 3;

    for (let i = 0; i < jpegPages.length; i++) {
      const imageObject = nextObject++;
      const contentObject = nextObject++;
      const pageObject = nextObject++;

      imageObjectNumbers.push(imageObject);
      contentObjectNumbers.push(contentObject);
      pageObjectNumbers.push(pageObject);

      const jpeg = jpegPages[i].bytes;
      const width = jpegPages[i].width;
      const height = jpegPages[i].height;

      objects[imageObject] = {
        dictionary:
          "<< /Type /XObject /Subtype /Image" +
          " /Width " + width +
          " /Height " + height +
          " /ColorSpace /DeviceRGB /BitsPerComponent 8" +
          " /Filter /DCTDecode /Length " + jpeg.length + " >>",
        stream: jpeg
      };

      const content =
        "q\n" +
        A4_WIDTH_PT.toFixed(4) + " 0 0 " +
        A4_HEIGHT_PT.toFixed(4) + " 0 0 cm\n" +
        "/Im" + (i + 1) + " Do\n" +
        "Q\n";

      objects[contentObject] = {
        dictionary: "<< /Length " + ascii(content).length + " >>",
        stream: ascii(content)
      };

      objects[pageObject] = ascii(
        "<< /Type /Page /Parent 2 0 R" +
        " /MediaBox [0 0 " + A4_WIDTH_PT.toFixed(4) + " " + A4_HEIGHT_PT.toFixed(4) + "]" +
        " /Resources << /XObject << /Im" + (i + 1) + " " + imageObject + " 0 R >> >>" +
        " /Contents " + contentObject + " 0 R >>"
      );
    }

    objects[2] = ascii(
      "<< /Type /Pages /Kids [" +
      pageObjectNumbers.map(n => n + " 0 R").join(" ") +
      "] /Count " + pageObjectNumbers.length + " >>"
    );

    const header = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A,
      0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A
    ]);

    const parts = [header];
    const offsets = new Array(objects.length).fill(0);
    let position = header.length;

    function addPart(part) {
      parts.push(part);
      position += part.length;
    }

    for (let n = 1; n < objects.length; n++) {
      offsets[n] = position;
      addPart(ascii(n + " 0 obj\n"));

      const obj = objects[n];
      if (obj && obj.dictionary && obj.stream) {
        addPart(ascii(obj.dictionary + "\nstream\n"));
        addPart(obj.stream);
        addPart(ascii("\nendstream\nendobj\n"));
      } else {
        addPart(obj);
        addPart(ascii("\nendobj\n"));
      }
    }

    const xrefOffset = position;
    addPart(ascii("xref\n0 " + objects.length + "\n"));
    addPart(ascii("0000000000 65535 f \n"));

    for (let n = 1; n < objects.length; n++) {
      addPart(ascii(String(offsets[n]).padStart(10, "0") + " 00000 n \n"));
    }

    addPart(ascii(
      "trailer\n" +
      "<< /Size " + objects.length +
      " /Root 1 0 R" +
      " /Info << /Title (" + pdfEscape(qualityLabel) + ") >> >>\n" +
      "startxref\n" +
      xrefOffset + "\n" +
      "%%EOF"
    ));

    return concatBytes(parts);
  }

  global.EucalyptusPDF = {
    createPdf,
    A4_WIDTH_PT,
    A4_HEIGHT_PT
  };
})(window);
