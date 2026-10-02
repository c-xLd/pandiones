/** Server-side quote for one cart line: current price and stock from the catalog record.
 *  The client cart lives in localStorage, so its price and quantity are only a draft. */

export type CartQuoteRequestLine = {
  id?: string;
  slug?: string;
  size: string;
  quantity: number;
  price?: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  variants: Array<{ size: string; stock: number }>;
};

export type CartLineStatus = 'ok' | 'price-changed' | 'insufficient-stock' | 'sold-out' | 'unavailable';

export type CartLineQuote = {
  key: string;
  status: CartLineStatus;
  /** Current catalog price; null when the product is no longer on sale. */
  price: number | null;
  /** Units available for this size; 0 when sold out or unavailable. */
  stock: number;
};

export const cartLineKey = (slug: string | undefined, size: string) =>
  `${slug ?? ''}::${size.trim().toUpperCase()}`;

export const MAX_QUOTE_LINES = 50;

export function evaluateCartLine(line: CartQuoteRequestLine, product: CatalogProduct | null): CartLineQuote {
  const size = line.size.trim().toUpperCase();
  const key = cartLineKey(line.slug, line.size);

  if (!product) return { key, status: 'unavailable', price: null, stock: 0 };

  const variant = product.variants.find((v) => v.size.trim().toUpperCase() === size);
  if (!variant) return { key, status: 'unavailable', price: product.price, stock: 0 };

  const stock = Math.max(0, variant.stock);
  const quantity = Math.max(1, Math.floor(line.quantity) || 1);

  if (stock === 0) return { key, status: 'sold-out', price: product.price, stock: 0 };
  if (quantity > stock) return { key, status: 'insufficient-stock', price: product.price, stock };
  if (typeof line.price === 'number' && line.price !== product.price) {
    return { key, status: 'price-changed', price: product.price, stock };
  }
  return { key, status: 'ok', price: product.price, stock };
}

/** Lines that block checkout: the server would reject the order for these. */
export const isBlockingStatus = (status: CartLineStatus) =>
  status === 'sold-out' || status === 'unavailable' || status === 'insufficient-stock';
