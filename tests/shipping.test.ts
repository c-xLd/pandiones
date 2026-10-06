import assert from 'node:assert/strict';
import test from 'node:test';
import { CODE128_PATTERNS, code128Bars, code128Values } from '../src/lib/shipping/code128';
import { canMoveShipment } from '../src/lib/shipping/statuses';
import { senderFromSettings } from '../src/lib/shipping/sender';
import { mapPttStatus } from '../src/lib/shipping/ptt/status-map';
import { pttConfig, pttStatus } from '../src/lib/shipping/ptt/config';
import { buildEnvelope, childFields, firstText, parseWsdl } from '../src/lib/shipping/ptt/soap';
import { parseMovements, parsePttDate } from '../src/lib/shipping/ptt/adapter';

const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

test('Code 128 table: 107 distinct symbols, 11 modules each (stop 13), even bar width', () => {
  assert.equal(CODE128_PATTERNS.length, 107);
  assert.equal(new Set(CODE128_PATTERNS).size, 107);
  CODE128_PATTERNS.forEach((pattern, value) => {
    const widths = [...pattern].map(Number);
    assert.equal(widths.reduce((a, b) => a + b, 0), value === 106 ? 13 : 11, `symbol ${value}`);
    assert.equal(widths.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) % 2, 0, `symbol ${value} bar parity`);
  });
});

test('Code 128 B values carry the modulo-103 check symbol', () => {
  // Worked example: "PJJ123" → data 48 42 42 17 18 19; (104 + 48 + 84 + 126 + 68 + 90 + 114) = 634, 634 % 103 = 16.
  assert.deepEqual(code128Values('PJJ123'), [104, 48, 42, 42, 17, 18, 19, 16, 106]);
  assert.throws(() => code128Values('Çanta'));
  const { bars, width } = code128Bars('KP123');
  assert.ok(bars.length > 0);
  // 10 quiet + 11 per symbol (start, 5 data, check) + 13 stop + 10 quiet.
  assert.equal(width, 10 + 11 * 7 + 13 + 10);
});

test('shipment status moves', () => {
  assert.ok(canMoveShipment('ETIKET_HAZIR', 'KABUL'));
  assert.ok(canMoveShipment('KABUL', 'TESLIM_EDILDI'));
  assert.ok(canMoveShipment('TESLIM_EDILEMEDI', 'DAGITIMDA'));
  assert.ok(!canMoveShipment('TESLIM_EDILDI', 'DAGITIMDA'));
  assert.ok(!canMoveShipment('ETIKET_HAZIR', 'TESLIM_EDILDI'));
  assert.ok(!canMoveShipment('IPTAL', 'KABUL'));
});

test('a label needs the full sender', () => {
  const missing = senderFromSettings({ senderName: 'Pandiones', senderPhone: null, senderAddress: ' ', senderDistrict: 'Çankaya', senderCity: 'Ankara' });
  assert.equal(missing.complete, false);
  assert.ok(!missing.complete && missing.missing.includes('telefon') && missing.missing.includes('adres'));
  const ok = senderFromSettings({ senderName: 'Pandiones', senderPhone: '0555 555 55 55', senderAddress: 'Atatürk Blv. 1', senderDistrict: 'Çankaya', senderCity: 'Ankara' });
  assert.ok(ok.complete && ok.sender.city === 'Ankara');
});

test('PTT movement wording maps to statuses; unknown wording keeps the status', () => {
  assert.equal(mapPttStatus('Gönderi kabul edildi'), 'KABUL');
  assert.equal(mapPttStatus('DAĞITIMA ÇIKARILDI'), 'DAGITIMDA');
  assert.equal(mapPttStatus('Alıcıya teslim edildi'), 'TESLIM_EDILDI');
  assert.equal(mapPttStatus('Teslim edilemedi - adreste bulunamadı'), 'TESLIM_EDILEMEDI');
  assert.equal(mapPttStatus('Göndericiye iade edildi'), 'IADE');
  assert.equal(mapPttStatus('Transfer merkezine ulaştı'), null);
});

test('PTT config: off without credentials, test env refused on production', () => {
  assert.equal(pttConfig(env({})), null);
  assert.equal(pttStatus(env({})).mode, 'MANUAL');
  const prod = pttConfig(env({ PTT_MUSTERI_ID: '123', PTT_SIFRE: 's' }));
  assert.ok(prod && prod.env === 'prod' && prod.acceptUrl.endsWith('/PttVeriYukleme/services/Sorgu'));
  assert.throws(() => pttConfig(env({ PTT_MUSTERI_ID: '1', PTT_SIFRE: 's', PTT_ENV: 'test', VERCEL_ENV: 'production' })));
  assert.equal(pttStatus(env({ PTT_MUSTERI_ID: '1', PTT_SIFRE: 's', PTT_ENV: 'test', VERCEL_ENV: 'production' })).mode, 'MANUAL');
});

// A hand-written WSDL shaped like an Axis2 service; the real one is read from PTT at run time.
const WSDL = `<wsdl:definitions targetNamespace="http://kabul.example">
  <wsdl:types>
    <xs:schema targetNamespace="http://kabul.example" elementFormDefault="qualified"><xs:element name="kabulEkle2"/><xs:element name="input"/></xs:schema>
    <xs:schema targetNamespace="http://kabul.example/xsd" elementFormDefault="qualified"><xs:element name="dongu"/><xs:element name="barkodNo"/><xs:element name="musteriId"/></xs:schema>
  </wsdl:types></wsdl:definitions>`;

test('SOAP envelope uses the namespaces the WSDL declares and escapes values', () => {
  const xml = buildEnvelope(parseWsdl(WSDL), 'kabulEkle2', { input: { dongu: [{ barkodNo: 'KP1<2' }], musteriId: '42' } });
  assert.match(xml, /<n0:kabulEkle2>/);
  assert.match(xml, /xmlns:n0="http:\/\/kabul.example"/);
  assert.match(xml, /xmlns:n1="http:\/\/kabul.example\/xsd"/);
  assert.match(xml, /<n1:barkodNo>KP1&lt;2<\/n1:barkodNo>/);
  assert.match(xml, /<n0:input><n1:dongu>/);
});

test('responses are read by local name; movements become dated events, oldest first', () => {
  const answer = `<soapenv:Envelope><soapenv:Body><ns:gonderiSorgu2Response><ns:return>
    <ax:dongu><ax:ITARIH>12.10.2026</ax:ITARIH><ax:ISAAT>16:40</ax:ISAAT><ax:IEVENT>ALICIYA TESLİM EDİLDİ</ax:IEVENT><ax:IMERK>Çankaya</ax:IMERK></ax:dongu>
    <ax:dongu><ax:ITARIH>11.10.2026</ax:ITARIH><ax:ISAAT>09:05</ax:ISAAT><ax:IEVENT>Kabul edildi</ax:IEVENT><ax:IMERK>Kızılay PTT</ax:IMERK></ax:dongu>
    <ax:dongu><ax:IEVENT>tarihsiz satır</ax:IEVENT></ax:dongu>
  </ns:return></ns:gonderiSorgu2Response></soapenv:Body></soapenv:Envelope>`;
  const events = parseMovements(answer);
  assert.equal(events.length, 2);
  assert.equal(events[0].status, 'KABUL');
  assert.equal(events[1].status, 'TESLIM_EDILDI');
  assert.equal(events[1].location, 'Çankaya');
  assert.equal(events[1].at.toISOString(), '2026-10-12T13:40:00.000Z');
  assert.equal(firstText('<a:hataKodu>1</a:hataKodu>', 'hataKodu'), '1');
  assert.deepEqual(childFields('<x:a>1</x:a><x:b>&amp;</x:b>'), { a: '1', b: '&' });
  assert.equal(parsePttDate('2026-10-12', '08:00')?.toISOString(), '2026-10-12T05:00:00.000Z');
});
