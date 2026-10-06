'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { parseTrackingCsv, type TrackingRow } from '@/lib/admin/tracking-csv';
import { errorText, sendJson } from '../../_lib/request';

type RowResult = { line: number; orderNumber: string; ok: boolean; reason?: string; emailSent?: boolean; willShip?: boolean };
type Step = 'input' | 'preview' | 'done';

const EXAMPLE = 'PAN-1042;Yurtiçi Kargo;YK1234567890\nPAN-1043;Aras Kargo;AR-55667788';

/** Tracking numbers for many orders from a sheet: parse here, check on the server (dry run), then apply. */
export default function TrackingImportDialog({ onClose, onApplied }: { onClose(): void; onApplied(message: string, tone: 'success' | 'error'): void }) {
  const [step, setStep] = useState<Step>('input');
  const [text, setText] = useState('');
  const [ship, setShip] = useState(true);
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ line: number; reason: string }[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 200_000) {
      setError('Dosya çok büyük (en çok 200 KB).');
      return;
    }
    setText(await file.text());
    setError(null);
  };

  const check = async (shipValue = ship) => {
    if (pending) return;
    const parsed = parseTrackingCsv(text);
    setParseErrors(parsed.errors);
    if (parsed.rows.length === 0) {
      setError(parsed.errors.length ? 'Geçerli satır yok; aşağıdaki satırları düzeltin.' : 'Önce dosya seçin ya da satırları yapıştırın.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await sendJson<{ results: RowResult[] }>('/api/admin/orders/tracking-import', 'POST', { rows: parsed.rows, ship: shipValue, dryRun: true }, 'Satırlar denetlenemedi.');
      setRows(parsed.rows);
      setResults(data.results);
      setStep('preview');
    } catch (err) {
      setError(errorText(err, 'Satırlar denetlenemedi.'));
    } finally {
      setPending(false);
    }
  };

  const apply = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const data = await sendJson<{ results: RowResult[] }>('/api/admin/orders/tracking-import', 'POST', { rows, ship, dryRun: false }, 'Takip numaraları yüklenemedi.');
      setResults(data.results);
      setStep('done');
      const written = data.results.filter((r) => r.ok).length;
      const failedEmail = data.results.filter((r) => r.ok && r.emailSent === false).length;
      const skipped = data.results.length - written;
      const message = `${written} siparişe takip numarası yazıldı${skipped ? `, ${skipped} satır atlandı` : ''}${failedEmail ? `, ${failedEmail} müşteriye kargo e-postası gönderilemedi` : ''}.`;
      onApplied(message, failedEmail || skipped ? 'error' : 'success');
    } catch (err) {
      setError(errorText(err, 'Takip numaraları yüklenemedi.'));
    } finally {
      setPending(false);
    }
  };

  const valid = results.filter((r) => r.ok).length;
  const invalid = results.length - valid + parseErrors.length;

  return (
    <Dialog open onClose={() => !pending && onClose()} title="Toplu kargo yükle" eyebrow="Takip numaraları" className="adm-dialog" size="lg">
      <div className="adm-form">
        {step === 'input' ? (
          <>
            <div className="adm-dialog__lead">
              <p>Her satıra bir sipariş: sipariş no; kargo firması; takip numarası. Ayraç noktalı virgül, virgül ya da sekme olabilir; başlık satırı isteğe bağlı. En çok 200 satır.</p>
            </div>
            <div className="adm-field">
              <label htmlFor="tracking-file">Dosya (.csv, .txt)</label>
              <input id="tracking-file" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => readFile(e.target.files?.[0])} />
            </div>
            <div className="adm-field">
              <label htmlFor="tracking-text">Satırlar</label>
              <textarea id="tracking-text" rows={8} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} aria-describedby="tracking-text-hint" />
              <p id="tracking-text-hint" className="adm-field__hint">
                Firma adları: Yurtiçi Kargo, MNG Kargo, Aras Kargo, Kolay Gelsin, Sürat Kargo, PTT Kargo (“yurtici”, “MNG” gibi yazımlar da tanınır).
              </p>
            </div>
            <div className="adm-field adm-field--check">
              <input id="tracking-ship" type="checkbox" checked={ship} onChange={(e) => setShip(e.target.checked)} aria-describedby="tracking-ship-hint" />
              <div>
                <label htmlFor="tracking-ship">Kargoya da ver</label>
                <p id="tracking-ship-hint" className="adm-field__hint">
                  Ödendi ve Hazırlanıyor siparişler Kargoda olur ve müşteriye kargo e-postası gider. Zaten kargodaki siparişlerin yalnız numarası güncellenir.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="adm-dialog__lead">
              {step === 'preview'
                ? `${valid} satır yazılmaya hazır${invalid ? `, ${invalid} satır hatalı ve atlanacak` : ''}.${ship ? ' Uygun siparişler kargoya verilecek.' : ''}`
                : `${valid} siparişe yazıldı${invalid ? `, ${invalid} satır atlandı` : ''}.`}
            </p>
            <div className="adm-table-scroll adm-table-scroll--flat adm-import__table">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Satır</th>
                    <th scope="col">Sipariş</th>
                    <th scope="col">Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {[...parseErrors.map((e) => ({ line: e.line, orderNumber: '—', ok: false, reason: e.reason }) as RowResult), ...results]
                    .sort((a, b) => a.line - b.line)
                    .map((result) => (
                      <tr key={`${result.line}-${result.orderNumber}`}>
                        <td className="adm-cell__sub">{result.line}</td>
                        <td className="adm-cell__main">{result.orderNumber}</td>
                        <td>
                          {result.ok ? (
                            <span className="adm-status adm-status--success">
                              {step === 'done'
                                ? result.emailSent === false
                                  ? 'Yazıldı, e-posta gönderilemedi'
                                  : result.emailSent
                                    ? 'Kargoya verildi, e-posta gönderildi'
                                    : 'Yazıldı'
                                : result.willShip
                                  ? 'Yazılacak ve kargoya verilecek'
                                  : 'Yazılacak'}
                            </span>
                          ) : (
                            <span className="adm-cell__sub adm-text-danger">{result.reason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {error ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="adm-dialog__actions">
          {step === 'input' ? (
            <>
              <button type="button" className="adm-btn" onClick={onClose} disabled={pending}>
                Vazgeç
              </button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => check()} disabled={pending || !text.trim()} aria-busy={pending}>
                {pending ? 'Denetleniyor' : 'Denetle'}
              </button>
            </>
          ) : step === 'preview' ? (
            <>
              <button type="button" className="adm-btn" onClick={() => setStep('input')} disabled={pending}>
                Geri
              </button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={apply} disabled={pending || valid === 0} aria-busy={pending}>
                {pending ? 'Yazılıyor' : `${valid} satırı uygula`}
              </button>
            </>
          ) : (
            <button type="button" className="adm-btn adm-btn--primary" onClick={onClose}>
              Kapat
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
