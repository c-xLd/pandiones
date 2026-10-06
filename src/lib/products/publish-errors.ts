/** getPublishErrors (media-domain.ts) codes in words the admin can act on. Pure; used by the API and the editor. */
export const PUBLISH_ERROR_TEXT: Record<string, string> = {
  price: 'Fiyat sıfırdan büyük olmalı.',
  category: 'Kategori İç giyim ya da Ev giyim olmalı.',
  color: 'Renk boş.',
  variants: 'Beden ve stok bilgisi eksik ya da hatalı.',
  cover: 'Tek bir kapak görseli seçilmeli.',
  poster: 'Video kapağın poster görseli yok.',
  image: 'En az bir görsel gerekli.',
};

export const publishErrorText = (codes: string[]) => codes.map((code) => PUBLISH_ERROR_TEXT[code] ?? code);
