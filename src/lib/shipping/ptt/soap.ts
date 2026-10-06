/**
 * Minimal SOAP over fetch for PTT's Axis services (no dependency). Namespaces are read from the service's
 * own WSDL instead of being hard-coded, because the public integrations do not document them and PTT's
 * contract documentation is not in hand yet. Responses are read by local element name, prefix-agnostic.
 * Pure helpers are exported for tests (tests/ptt-client.test.ts).
 */

export class PttError extends Error {
  constructor(message: string, readonly code: 'NETWORK' | 'HTTP' | 'FAULT' | 'REJECTED' | 'WSDL') {
    super(message);
  }
}

export type SchemaInfo = { namespace: string; qualified: boolean };
export type WsdlInfo = {
  /** Schema that declares the operation element (e.g. kabulEkle2). */
  operation: (name: string) => SchemaInfo;
  /** Schema that declares a field (e.g. dongu, musteriId). */
  field: (name: string) => SchemaInfo;
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] as string);

/** Schemas of a WSDL with the element names each declares. */
export function parseWsdl(wsdl: string): WsdlInfo {
  const schemas: { info: SchemaInfo; names: Set<string> }[] = [];
  const schemaRe = /<(?:\w+:)?schema\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?schema>/g;
  for (let match = schemaRe.exec(wsdl); match; match = schemaRe.exec(wsdl)) {
    const attrs = match[1];
    const namespace = /targetNamespace="([^"]+)"/.exec(attrs)?.[1];
    if (!namespace) continue;
    const qualified = /elementFormDefault="qualified"/.test(attrs);
    const names = new Set(Array.from(match[2].matchAll(/<(?:\w+:)?element\b[^>]*\bname="([^"]+)"/g), (m) => m[1]));
    schemas.push({ info: { namespace, qualified }, names });
  }
  const wsdlNamespace = /<(?:\w+:)?definitions\b[^>]*targetNamespace="([^"]+)"/.exec(wsdl)?.[1];
  if (!schemas.length && !wsdlNamespace) throw new PttError('PTT WSDL okunamadı.', 'WSDL');
  const fallback: SchemaInfo = schemas[0]?.info ?? { namespace: wsdlNamespace as string, qualified: false };
  const find = (name: string) => schemas.find((schema) => schema.names.has(name))?.info ?? fallback;
  return { operation: find, field: find };
}

type Value = string | number | null | undefined | Value[] | { [key: string]: Value };

/** Builds the envelope. Field elements get their schema's prefix only when that schema is qualified. */
export function buildEnvelope(info: WsdlInfo, operation: string, body: Record<string, Value>): string {
  const prefixes = new Map<string, string>();
  const prefixOf = (namespace: string) => {
    if (!prefixes.has(namespace)) prefixes.set(namespace, `n${prefixes.size}`);
    return prefixes.get(namespace) as string;
  };
  const opSchema = info.operation(operation);
  const opPrefix = prefixOf(opSchema.namespace);

  const render = (name: string, value: Value): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map((item) => render(name, item)).join('');
    const schema = info.field(name);
    const tag = schema.qualified ? `${prefixOf(schema.namespace)}:${name}` : name;
    const inner = typeof value === 'object' ? Object.entries(value).map(([key, child]) => render(key, child)).join('') : escapeXml(String(value));
    return `<${tag}>${inner}</${tag}>`;
  };

  const content = Object.entries(body).map(([key, value]) => render(key, value)).join('');
  const xmlns = Array.from(prefixes, ([namespace, prefix]) => ` xmlns:${prefix}="${escapeXml(namespace)}"`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"${xmlns}><soapenv:Body><${opPrefix}:${operation}>${content}</${opPrefix}:${operation}></soapenv:Body></soapenv:Envelope>`;
}

const decode = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .trim();

/** Text of the first element with this local name (any prefix), or null. */
export function firstText(xml: string, name: string): string | null {
  const match = new RegExp(`<(?:[\\w-]+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`).exec(xml);
  return match ? decode(match[1]) : null;
}

/** Inner XML of every element with this local name. */
export function allBlocks(xml: string, name: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<(?:[\\w-]+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`, 'g')), (m) => m[1]);
}

/** Simple child elements of a block as name → text (first wins). */
export function childFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const match of block.matchAll(/<(?:[\w-]+:)?([\w-]+)\b[^>/]*>([^<]*)<\/(?:[\w-]+:)?\1>/g)) {
    if (!(match[1] in fields)) fields[match[1]] = decode(match[2]);
  }
  return fields;
}

const wsdlCache = new Map<string, Promise<WsdlInfo>>();

async function request(url: string, init: RequestInit, timeoutMs: number): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  } catch {
    throw new PttError('PTT servisine ulaşılamadı. Bir süre sonra tekrar deneyin.', 'NETWORK');
  }
  const text = await response.text();
  const fault = firstText(text, 'faultstring');
  if (fault) throw new PttError(`PTT servisi hata verdi: ${fault}`, 'FAULT');
  if (!response.ok) throw new PttError(`PTT servisi yanıt vermedi (HTTP ${response.status}).`, 'HTTP');
  return text;
}

export function loadWsdl(url: string): Promise<WsdlInfo> {
  const cached = wsdlCache.get(url);
  if (cached) return cached;
  const pending = request(`${url}?wsdl`, { method: 'GET' }, 10_000).then(parseWsdl);
  wsdlCache.set(url, pending);
  pending.catch(() => wsdlCache.delete(url));
  return pending;
}

export async function callSoap(url: string, operation: string, body: Record<string, Value>, timeoutMs = 15_000): Promise<string> {
  const info = await loadWsdl(url);
  return request(url, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"urn:${operation}"` }, body: buildEnvelope(info, operation, body) }, timeoutMs);
}
