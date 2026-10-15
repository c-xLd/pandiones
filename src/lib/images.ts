/** next/image encoding quality. Must match `images.qualities` in next.config.mjs.
 *  Fabric (lace, tulle, rib) loses its texture under AVIF/WebP below ~80, so photos use 90
 *  for crystal-clear textile and embroidery fidelity; thumbnails drop to 60. */
export const PHOTO_QUALITY = 90;
export const THUMB_QUALITY = 60;

