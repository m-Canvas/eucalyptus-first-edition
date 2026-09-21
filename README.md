# Eucalyptus — Updated Homepage

This update keeps the PDF-style reader architecture and changes the homepage.

## Homepage changes

1. Zubeen Garg's photo is circular.
2. The portrait has a layered golden frame with floral ornaments.
3. Tribute text is shown below:
   "1972 – ∞"
4. A larger tribute message is displayed below the year.
5. The old "Open Eucalyptus" text button has been replaced by the actual first magazine page.
6. Tapping the magazine cover opens the PDF-style reader.
7. The review section has a more editorial / memorial design.
8. The + button is now a pill-shaped "Share your thoughts" control.
9. The supplied Google Apps Script URL is already connected in script.js.

## Magazine images

Use:

assets/magazine/page-01.webp
assets/magazine/page-02.webp
...
assets/magazine/page-75.webp

## Homepage image

Use:

assets/zubeen.jpg

## PDF download

Optional:

pdf/Eucalyptus.pdf

## Google Apps Script

The supplied Web App URL is already placed in script.js.

The existing Google Sheet logic expects:

id | name | rating | review | date | status

Only reviews with status = active are displayed publicly.

## Important

Do not rename the magazine pages unless you also update getPagePath() in script.js.


## Reviews update
- Homepage displays only the 5 latest active reviews.
- "View all reviews" appears only when more than 5 reviews exist.
- The button opens `review.html`.
- `review.html` displays all active reviews with a standard editorial layout.
- The review page has a `+` button in the header to open the existing review form.
- Review submission keeps the Google Apps Script endpoint and uses a minimal one-line submitting state.


## Review loading optimization
- The 75 magazine page images remain eager-loaded exactly as before.
- The review API request is started before the eager magazine-page setup, giving Google Apps Script a head start.
- Cached reviews still render immediately when available.
- The homepage "View all reviews" button stays hidden until the review count is known.
- Google Apps Script connection preconnect hints were added.


## Direct PDF download
- The reader toolbar uses a circular download-arrow button instead of fullscreen.
- The button creates a single 75-page `Eucalyptus.pdf` directly in the browser.
- A local PDF generator is bundled at `libs/eucalyptus-pdf.js`; there is no CDN dependency.
- Each existing magazine image is placed on one A4 PDF page in serial order.
- The old homepage footer PDF download link is removed.
- The existing 75-image eager-loading reader behavior is unchanged.
