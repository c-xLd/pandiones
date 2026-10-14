'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Combobox, { type ComboOption } from './Combobox';
import VariantMediaStrip from './VariantMediaStrip';
import LinkColorPicker, { type ColorCandidate } from './LinkColorPicker';
import { VAT_RATES } from '@/lib/products/commerce-fields';
import { sortBySize } from '@/lib/products/sizes';
import { sizeSystemFor, sizesOutsideSystem } from '@/lib/products/size-systems';
import { DEFAULT_COLORS, getColorSwatch, getPersistentOptions, persistCustomOption } from '../../_lib/persistent-options';
import {
  applySizes,
  cellKey,
  hasColor,
  newColorGroup,
  sizesOf,
  suggestSku,
  type ColorGroup,
  type SizeRow,
  type VariantErrors,
} from '../../_lib/variant-model';

/**
 * "Renkler, bedenler ve medya": colours × sizes. Each colour is its own product in the colour family —
 * price, list price and VAT per colour (group header row), its photos and video (media strip), barcode,
 * stock and stock code per size. New colours are created as drafts on the next save; an existing product
 * can be linked as a colour. Empty stock codes are filled by the server on save (the cell shows the code).
 */
export function VariantMatrixSection({
  productName,
  category,
  subcategory,
  groups,
  onChange,
  errors,
  disabled,
  onOpenMedia,
  onUnlinkColor,
  currentProductId = null,
  onLinkProduct,
  onRegenerateSkus,
}: {
  productName: string;
  /** The chosen category decides which sizes are offered (src/lib/products/size-systems.ts). */
  category: string;
  subcategory: string;
  groups: ColorGroup[];
  onChange(groups: ColorGroup[]): void;
  errors: VariantErrors;
  disabled?: boolean;
  /** Opens "Renk medyası" for a colour (files of an unsaved colour wait for the save), on one item when given. */
  onOpenMedia(group: ColorGroup, mediaId?: string): void;
  /** A saved colour's ×: takes that product out of the family (it is not deleted). */
  onUnlinkColor(group: ColorGroup): void;
  /** The saved product being edited; linking an existing product needs it. */
  currentProductId?: string | null;
  onLinkProduct?(candidate: ColorCandidate): void;
  /** "Kodları yeniden oluştur" (the editor asks first). */
  onRegenerateSkus?(): void;
}) {
  const [colorOptions, setColorOptions] = useState<string[]>([...DEFAULT_COLORS]);
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [palette, setPalette] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorError, setColorError] = useState<string | null>(null);
  const [bulkStock, setBulkStock] = useState('');

  useEffect(() => {
    setColorOptions(getPersistentOptions('pandiones_custom_colors', DEFAULT_COLORS));
    setCustomSizes(getPersistentOptions('pandiones_custom_sizes', []));
  }, []);

  const sizes = sizesOf(groups);
  const system = sizeSystemFor(category, subcategory);
  // The category's sizes first, then sizes the admin added earlier (marked), then any in use.
  const sizeChoices: ComboOption[] = useMemo(() => {
    const own = new Set(system.sizes);
    const extra = [...new Set([...customSizes, ...sizes])].filter((size) => !own.has(size));
    return [...system.sizes.map((value) => ({ value })), ...extra.map((value) => ({ value, hint: 'eklediğiniz' }))];
  }, [system, customSizes, sizes]);
  const outside = sizesOutsideSystem(system, sizes);
  const missingSystemSizes = system.sizes.filter((size) => !sizes.includes(size));
  const setSizes = (next: string[]) => onChange(applySizes(groups, sortBySize(next.map((size) => ({ size }))).map(({ size }) => size)));
  const colorChoices: ComboOption[] = useMemo(() => colorOptions.map((value) => ({ value, swatch: getColorSwatch(value) })), [colorOptions]);
  const err = (key: string) => errors.cells[key];
  const rowCount = groups.reduce((sum, group) => sum + group.sizes.length, 0);

  const updateGroup = (key: string, patch: Partial<ColorGroup>) => onChange(groups.map((group) => (group.key === key ? { ...group, ...patch } : group)));
  const updateRow = (key: string, size: string, patch: Partial<SizeRow>) =>
    onChange(groups.map((group) => (group.key === key ? { ...group, sizes: group.sizes.map((row) => (row.size === size ? { ...row, ...patch } : row)) } : group)));

  function addColor() {
    const color = (colorName.trim() || palette.trim()).replace(/\s+/g, ' ');
    if (!color) return;
    if (color.length > 80) return setColorError('Renk adı en çok 80 karakter olabilir.');
    if (hasColor(groups, color)) return setColorError(`${color} zaten ekli.`);
    persistCustomOption('pandiones_custom_colors', palette.trim() || color);
    setColorOptions(getPersistentOptions('pandiones_custom_colors', DEFAULT_COLORS));
    // The first colour of a new product is the product itself; later ones become family drafts on save.
    onChange([...groups, newColorGroup(color, groups, groups.length === 0)]);
    setColorName('');
    setPalette('');
    setColorError(null);
  }

  function removeNewColor(key: string) {
    onChange(groups.filter((group) => group.key !== key));
  }

  function removeRow(key: string, size: string) {
    onChange(groups.map((group) => (group.key === key ? { ...group, sizes: group.sizes.filter((row) => row.size !== size) } : group)));
  }

  function applyBulkStock() {
    if (bulkStock.trim() === '' || !Number.isInteger(Number(bulkStock)) || Number(bulkStock) < 0) return;
    onChange(groups.map((group) => ({ ...group, sizes: group.sizes.map((row) => ({ ...row, stock: bulkStock })) })));
    setBulkStock('');
  }

  return (
    <section className="adm-vx" aria-labelledby="vx-title" data-field="variants" tabIndex={-1}>
      <h2 id="vx-title" className="adm-editor__heading">
        Renkler, bedenler ve medya
      </h2>
      <p className="adm-fieldset__lead">
        Her renk ayrı bir ürün olarak kaydedilir; kendi sayfası, stoğu, görselleri ve videosu olur. Fiyat, piyasa fiyatı ve KDV renk başına; barkod, stok ve stok kodu beden başınadır.
      </p>

      <div className="adm-vx__block">
        <span className="adm-vx__label" id="vx-color-label">
          Renk <span className="adm-required" aria-hidden="true">*</span>
        </span>
        <p className="adm-field__hint" id="vx-color-hint">
          Renk skalasından seçin ya da ürün sayfasında görünecek renk adını yazın (örn. Şampanya Saten). Renk adı yazılırsa o kullanılır.
        </p>
        <div className="adm-vx__color-row" role="group" aria-labelledby="vx-color-label" aria-describedby="vx-color-hint">
          <Combobox
            id="vx-palette"
            label="Renk skalası"
            placeholder="Renk skalası"
            options={colorChoices}
            value={palette}
            onChange={(value) => {
              setPalette(value);
              setColorError(null);
            }}
            allowCreate
            createLabel={(value) => `“${value}” rengini kullan`}
            disabled={disabled}
          />
          <input
            className="adm-vx__input"
            aria-label="Renk ismi"
            placeholder="Renk ismi"
            maxLength={80}
            value={colorName}
            disabled={disabled}
            onChange={(event) => {
              setColorName(event.target.value);
              setColorError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addColor();
              }
            }}
          />
          <button type="button" className="adm-btn adm-btn--primary" onClick={addColor} disabled={disabled || !(colorName.trim() || palette.trim())}>
            Renk ekle
          </button>
        </div>
        {colorError ? (
          <p className="adm-field-error" role="alert">
            {colorError}
          </p>
        ) : null}
        {groups.length ? (
          <ul className="adm-vx__chips" aria-label="Seçilen renkler">
            {groups.map((group) => (
              <li key={group.key} className="adm-vx__chip">
                <span className="adm-vx__swatch" style={{ background: getColorSwatch(group.color) }} aria-hidden="true" />
                <span>{group.color || 'Adsız renk'}</span>
                {group.isCurrent ? <span className="adm-vx__chip-note">bu ürün</span> : null}
                {!group.isCurrent ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => (group.productId ? onUnlinkColor(group) : removeNewColor(group.key))}
                    aria-label={group.productId ? `${group.color} rengini aileden çıkar` : `${group.color} rengini kaldır`}
                    title={group.productId ? 'Aileden çıkar (ürün silinmez)' : 'Kaldır'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {onLinkProduct ? <LinkColorPicker productId={currentProductId} disabled={disabled} onPick={onLinkProduct} /> : null}
      </div>

      <div className="adm-vx__block">
        <label className="adm-vx__label" htmlFor="vx-sizes">
          Beden <span className="adm-required" aria-hidden="true">*</span>
        </label>
        <Combobox
          id="vx-sizes"
          label="Beden"
          placeholder="Beden"
          multiple
          options={sizeChoices}
          value={sizes}
          onChange={setSizes}
          allowCreate
          createLabel={(value) => `“${value.toLocaleUpperCase('tr-TR')}” bedenini ekle`}
          onCreate={(value) => {
            persistCustomOption('pandiones_custom_sizes', value.toLocaleUpperCase('tr-TR'));
            setCustomSizes(getPersistentOptions('pandiones_custom_sizes', []));
          }}
          disabled={disabled || !groups.length}
          emptyText="Bu beden listede yok; yazıp Enter'a basın."
        />
        <p className="adm-field__hint">
          {category ? (
            <>
              <strong>{system.label}:</strong> {system.hint}
            </>
          ) : (
            'Önce kategori seçin; bedenler kategoriye göre önerilir.'
          )}
        </p>
        {!groups.length ? <p className="adm-field__hint">Önce bir renk ekleyin.</p> : null}
        {groups.length && category && system.sizes.length <= 6 && missingSystemSizes.length ? (
          <button type="button" className="adm-link adm-vx__suggest" disabled={disabled} onClick={() => setSizes([...sizes, ...missingSystemSizes])}>
            {sizes.length ? 'Eksik bedenleri ekle' : 'Tüm bedenleri ekle'}: {missingSystemSizes.join(', ')}
          </button>
        ) : null}
        {category && outside.length ? (
          <p className="adm-vx__warn" role="status">
            {outside.join(', ')} bu kategorinin beden sistemine ({system.label.toLocaleLowerCase('tr-TR')}) uymuyor. Doğruysa bırakın; değilse beden alanından kaldırın.
          </p>
        ) : null}
      </div>

      {errors.general ? (
        <p className="adm-field-error" role="alert">
          {errors.general}
        </p>
      ) : null}

      {rowCount ? (
        <div className="adm-vx__tools">
          <div className="adm-vx__tool">
            <label htmlFor="vx-bulk-stock">Tüm bedenlere stok</label>
            <input id="vx-bulk-stock" className="adm-vx__input adm-vx__input--num" type="number" min="0" step="1" inputMode="numeric" value={bulkStock} disabled={disabled} onChange={(e) => setBulkStock(e.target.value)} />
            <button type="button" className="adm-btn adm-btn--sm" onClick={applyBulkStock} disabled={disabled || bulkStock.trim() === ''}>
              Uygula
            </button>
          </div>
          {onRegenerateSkus ? (
            <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={onRegenerateSkus} disabled={disabled}>
              Kodları yeniden oluştur
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="adm-vx__table-wrap">
        <table className="adm-vx__table">
          <caption className="visually-hidden">Renk ve beden varyantları</caption>
          <thead>
            <tr>
              <th scope="col">Renk</th>
              <th scope="col">Beden</th>
              <th scope="col">Barkod</th>
              <th scope="col">Stok</th>
              <th scope="col">
                Stok kodu <span className="adm-vx__th-hint">boşsa kayıtta oluşur</span>
              </th>
              <th scope="col">
                <span className="visually-hidden">İşlem</span>
              </th>
            </tr>
          </thead>
          {rowCount ? (
            groups.map((group) => (
              <tbody key={group.key} className="adm-vx__group">
                <tr className="adm-vx__group-row">
                  <td colSpan={6}>
                    <div className="adm-vx__group-head">
                      <span className="adm-vx__swatch" style={{ background: getColorSwatch(group.color) }} aria-hidden="true" />
                      {group.isCurrent ? (
                        <input
                          className="adm-vx__input adm-vx__input--color"
                          aria-label="Bu ürünün renk adı"
                          maxLength={80}
                          value={group.color}
                          disabled={disabled}
                          aria-invalid={Boolean(err(cellKey(group.key, 'color'))) || undefined}
                          onChange={(e) => updateGroup(group.key, { color: e.target.value })}
                        />
                      ) : (
                        <strong className="adm-vx__group-name">{group.color}</strong>
                      )}
                      <span className={`adm-status adm-status--${group.productId ? (group.status === 'PUBLISHED' ? 'success' : 'warning') : 'muted'}`}>
                        {group.productId ? (group.status === 'PUBLISHED' ? 'Yayında' : 'Taslak') : 'Kaydedince oluşturulur'}
                      </span>
                      <span className="adm-vx__money">
                        <label>
                          <span>Satış fiyatı (₺, KDV dahil)</span>
                          <input
                            className="adm-vx__input adm-vx__input--num"
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            value={group.price}
                            disabled={disabled}
                            aria-invalid={Boolean(err(cellKey(group.key, 'price'))) || undefined}
                            onChange={(e) => updateGroup(group.key, { price: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>Piyasa fiyatı (₺)</span>
                          <input
                            className="adm-vx__input adm-vx__input--num"
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="İsteğe bağlı"
                            value={group.compareAtPrice}
                            disabled={disabled}
                            aria-invalid={Boolean(err(cellKey(group.key, 'compareAtPrice'))) || undefined}
                            onChange={(e) => updateGroup(group.key, { compareAtPrice: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>KDV</span>
                          <select className="adm-vx__input" value={group.vatRate} disabled={disabled} onChange={(e) => updateGroup(group.key, { vatRate: e.target.value })}>
                            {VAT_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                %{rate}
                                {rate === 10 ? ' (giyim)' : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                      </span>
                      <span className="adm-vx__group-actions">
                        {!group.productId && !group.isCurrent ? (
                          <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" onClick={() => removeNewColor(group.key)} disabled={disabled}>
                            Rengi çıkar
                          </button>
                        ) : null}
                        {group.productId && !group.isCurrent ? (
                          <Link className="adm-link" href={`/yonetim/urunler/${group.productId}`}>
                            Sayfasını aç<span className="visually-hidden"> ({group.color})</span>
                          </Link>
                        ) : null}
                      </span>
                    </div>
                    {[cellKey(group.key, 'color'), cellKey(group.key, 'price'), cellKey(group.key, 'compareAtPrice'), cellKey(group.key, 'sizes')]
                      .map((key) => err(key))
                      .filter(Boolean)
                      .map((message) => (
                        <p key={message} className="adm-field-error">
                          {group.color}: {message}
                        </p>
                      ))}
                  </td>
                </tr>
                <tr className="adm-vx__strip-row">
                  <td colSpan={6}>
                    <VariantMediaStrip group={group} disabled={disabled} onOpen={onOpenMedia} />
                  </td>
                </tr>
                {group.sizes.map((row) => {
                  const barcodeErr = err(cellKey(group.key, 'barcode', row.size));
                  const stockErr = err(cellKey(group.key, 'stock', row.size));
                  const skuErr = err(cellKey(group.key, 'sku', row.size));
                  const label = `${group.color} ${row.size}`;
                  return (
                    <tr key={row.size}>
                      <td>{group.color}</td>
                      <td>
                        <span className="adm-vx__size">{row.size}</span>
                      </td>
                      <td>
                        <input
                          className="adm-vx__input"
                          inputMode="numeric"
                          maxLength={13}
                          placeholder="İsteğe bağlı"
                          aria-label={`${label} barkod`}
                          value={row.barcode}
                          disabled={disabled}
                          aria-invalid={Boolean(barcodeErr) || undefined}
                          title={barcodeErr}
                          onChange={(e) => updateRow(group.key, row.size, { barcode: e.target.value.replace(/\D/g, '') })}
                        />
                        {barcodeErr ? <span className="adm-vx__cell-error">{barcodeErr}</span> : null}
                      </td>
                      <td>
                        <input
                          className="adm-vx__input adm-vx__input--num"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          aria-label={`${label} stok`}
                          value={row.stock}
                          disabled={disabled}
                          aria-invalid={Boolean(stockErr) || undefined}
                          onChange={(e) => updateRow(group.key, row.size, { stock: e.target.value })}
                        />
                        {stockErr ? <span className="adm-vx__cell-error">{stockErr}</span> : null}
                      </td>
                      <td>
                        <input
                          className="adm-vx__input"
                          maxLength={40}
                          placeholder={suggestSku(productName, group.color, row.size)}
                          aria-label={`${label} stok kodu`}
                          value={row.sku}
                          disabled={disabled}
                          aria-invalid={Boolean(skuErr) || undefined}
                          onChange={(e) => updateRow(group.key, row.size, { sku: e.target.value.toUpperCase() })}
                        />
                        {skuErr ? <span className="adm-vx__cell-error">{skuErr}</span> : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="adm-icon-btn"
                          onClick={() => removeRow(group.key, row.size)}
                          disabled={disabled || group.sizes.length <= 1}
                          aria-label={`${label} varyantını kaldır`}
                          title={group.sizes.length <= 1 ? 'Her rengin en az bir bedeni olmalı' : 'Bu bedeni bu renkten kaldır'}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))
          ) : (
            <tbody>
              <tr>
                <td colSpan={6}>
                  <div className="adm-vx__empty">
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M8 16 24 8l16 8v16l-16 8-16-8z" />
                      <path d="M8 16l16 8 16-8M24 24v16" />
                    </svg>
                    <strong>Henüz hiçbir varyant yok</strong>
                    <span>Satış bilgilerini girmek için doldurmanız gereken alanlar: {!groups.length ? 'Renk, Beden' : 'Beden'}.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </section>
  );
}
