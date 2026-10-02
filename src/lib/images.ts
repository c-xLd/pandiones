/** next/image encoding quality. Must match `images.qualities` in next.config.mjs.
 *  Fabric (lace, tulle, rib) loses its texture under AVIF/WebP below ~80, so photos use 85;
 *  only tiny thumbnails (variant swatches, modal strip) drop to 60. */
export const PHOTO_QUALITY = 85;
export const THUMB_QUALITY = 60;

