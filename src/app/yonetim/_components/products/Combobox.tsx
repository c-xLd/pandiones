'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

export type ComboOption = { value: string; label?: string; hint?: string; swatch?: string };

type Common = {
  id?: string;
  label: string;
  placeholder?: string;
  options: ComboOption[];
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Lets the admin type a value that is not in the list ("“90B” ekle"). */
  allowCreate?: boolean;
  createLabel?: (value: string) => string;
  /** Called once for a newly typed value (e.g. to remember it for the next product). */
  onCreate?: (value: string) => void;
  emptyText?: string;
};

type SingleProps = Common & { multiple?: false; value: string; onChange(value: string): void };
type MultiProps = Common & { multiple: true; value: string[]; onChange(value: string[]): void };

const fold = (text: string) => text.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Searchable select: one field you type into, a list below with hairline separators, a search icon and
 * a chevron. Single or multiple choice (ticks), optional free entry. Keyboard: ↓/↑ move, Enter picks,
 * Escape closes, Backspace on an empty field removes the last chosen value. ARIA combobox + listbox.
 */
export default function Combobox(props: SingleProps | MultiProps) {
  const { label, placeholder, options, disabled, invalid, describedBy, allowCreate, createLabel, onCreate, emptyText } = props;
  const autoId = useId();
  const inputId = props.id ?? `cb-${autoId}`;
  const listId = `${inputId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const labelOf = (value: string) => options.find((option) => option.value === value)?.label ?? value;

  const visible = useMemo((): (ComboOption & { create?: boolean })[] => {
    const q = fold(query.trim());
    // Exact match first, then names that start with the text, then the rest ("S" → S before XS).
    const rank = (option: ComboOption) => {
      const text = fold(option.label ?? option.value);
      return text === q ? 0 : text.startsWith(q) ? 1 : 2;
    };
    const list = q
      ? options
          .filter((option) => fold(option.label ?? option.value).includes(q))
          .map((option, index) => ({ option, index }))
          .sort((a, b) => rank(a.option) - rank(b.option) || a.index - b.index)
          .map(({ option }) => option)
      : options;
    const typed = query.trim();
    const exists = options.some((option) => fold(option.value) === fold(typed));
    return allowCreate && typed && !exists ? [...list, { value: typed, label: createLabel ? createLabel(typed) : `“${typed}” ekle`, create: true as const }] : list;
  }, [options, query, allowCreate, createLabel]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId]);

  function pick(option: ComboOption & { create?: boolean }) {
    if (option.create) onCreate?.(option.value);
    if (props.multiple) {
      const next = selected.includes(option.value) ? selected.filter((value) => value !== option.value) : [...selected, option.value];
      props.onChange(next);
      setQuery('');
      inputRef.current?.focus();
    } else {
      props.onChange(option.value);
      setQuery('');
      setOpen(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((index) => Math.min(index + 1, visible.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && visible[active]) {
        event.preventDefault();
        pick(visible[active]);
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery('');
      }
    } else if (event.key === 'Backspace' && props.multiple && !query && selected.length) {
      props.onChange(selected.slice(0, -1));
    }
  }

  const shown = open ? query : props.multiple ? '' : labelOf(selected[0] ?? '');

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        // Tabbing (or clicking) out of the field closes the list.
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery('');
        }
      }}
      className={`adm-combo${open ? ' is-open' : ''}${invalid ? ' is-invalid' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="adm-combo__control" onMouseDown={(event) => {
        if (disabled || event.target === inputRef.current) return;
        event.preventDefault();
        setOpen((value) => !value);
        inputRef.current?.focus();
      }}>
        {props.multiple && selected.length ? (
          <span className="adm-combo__chips">
            {selected.map((value) => (
              <span key={value} className="adm-combo__chip">
                {labelOf(value)}
                <button
                  type="button"
                  aria-label={`${labelOf(value)} kaldır`}
                  disabled={disabled}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={() => props.onChange(selected.filter((item) => item !== value))}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </span>
            ))}
          </span>
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && visible[active] ? `${listId}-${active}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="adm-combo__input"
          placeholder={props.multiple && selected.length ? '' : placeholder ?? label}
          value={shown}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <span className="adm-combo__icons" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="adm-combo__search"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" /></svg>
          <span className="adm-combo__divider" />
          <svg viewBox="0 0 24 24" className="adm-combo__chevron"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </div>
      {open ? (
        <ul id={listId} role="listbox" aria-multiselectable={props.multiple || undefined} aria-label={label} className="adm-combo__list">
          {visible.length ? (
            visible.map((option, index) => {
              const isSelected = selected.includes(option.value) && !(option.create);
              return (
                <li
                  key={`${option.value}-${index}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`adm-combo__option${index === active ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}${option.create ? ' is-create' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                >
                  {props.multiple && !(option.create) ? <span className="adm-combo__tick" aria-hidden="true" /> : null}
                  {option.swatch ? <span className="adm-combo__swatch" style={{ background: option.swatch }} aria-hidden="true" /> : null}
                  <span className="adm-combo__option-label">{option.label ?? option.value}</span>
                  {option.hint ? <span className="adm-combo__hint">{option.hint}</span> : null}
                </li>
              );
            })
          ) : (
            <li className="adm-combo__empty" role="presentation">{emptyText ?? 'Sonuç yok'}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
