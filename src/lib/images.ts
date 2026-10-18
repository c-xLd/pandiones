/** next/image encoding quality. Must match `images.qualities` in next.config.mjs.
 *  Fabric (lace, tulle, rib) loses its texture under AVIF/WebP below ~80, so photos use 90
 *  for crystal-clear textile and embroidery fidelity; thumbnails drop to 60. */
export const PHOTO_QUALITY = 90;
export const THUMB_QUALITY = 60;

/* `sizes` for the product photos: how wide each photo is really drawn, so the browser fetches a file with
   the screen's own pixel density and nothing bigger. Files come in AVIF/WebP and up to 3840 px (4K). */

/** Product page strip. Phones: the photo fills the screen's height and a 3:4 photo is then ~1.35× the
 *  screen width (the sides are cropped). Desktop: tall, narrow frames crop the photo, so ~2× their width. */
export const PDP_GALLERY_SIZES = '(max-width: 900px) 135vw, 1040px';

/** Full-screen gallery. Phones: the photo covers the screen (3:4 on a tall screen ≈ 1.65× its width).
 *  Desktop: the photo fits the screen's height, so a 3:4 photo is 75 % of the height wide. */
export const MODAL_SIZES = '(max-width: 768px) 165vw, 75vh';

/** The same photo while zoomed (×2.3): only then does the browser fetch the large (up to 4K) file. */
export const MODAL_ZOOM_SIZES = '(max-width: 768px) 380vw, 173vh';

