'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

export type CategoryNode = { id: string; slug: string; name: string; children?: CategoryNode[] };
type Row = { node: CategoryNode; level: number; path: CategoryNode[]; hasChildren: boolean };

const fold = (text: string) => text.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Category and sub-category in one field: type to search, a tree with chevrons below (Trendyol-style).
 * A category with sub-categories only gathers them (its listing shows all their products), so clicking it
 * opens or closes the branch; the product is placed in a sub-category (both slugs are stored). A category
 * without sub-categories can be picked itself. Keyboard: ↓/↑ move, → opens, ← closes, Enter picks a
 * sub-category or opens a branch, Escape closes. ARIA combobox + tree.
 */
export default function CategoryTreeSelect({
  id,
  categories,
  category,
  subcategory,
  onChange,
  disabled,
  invalid,
  describedBy,
  placeholder = 'Kategori',
}: {
  id?: string;
  categories: CategoryNode[];
  category: string;
  subcategory: string;
  onChange(value: { category: string; subcategory: string }): void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const autoId = useId();
  const inputId = id ?? `ct-${autoId}`;
  const treeId = `${inputId}-tree`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(0);

  const root = categories.find((node) => node.slug === category);
  const child = root?.children?.find((node) => node.slug === subcategory);
  const selectedLabel = root ? (child ? `${root.name} › ${child.name}` : root.children?.length ? '' : root.name) : '';

  // Open the branch of the current choice so it is visible when the list opens.
  useEffect(() => {
    if (open && root?.children?.length) setExpanded((current) => new Set(current).add(root.id));
  }, [open, root]);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    const out: Row[] = [];
    const matches = (node: CategoryNode): boolean => fold(node.name).includes(q) || (node.children ?? []).some(matches);
    const walk = (nodes: CategoryNode[], level: number, path: CategoryNode[]) => {
      for (const node of nodes) {
        if (q && !matches(node)) continue;
        const hasChildren = Boolean(node.children?.length);
        out.push({ node, level, path, hasChildren });
        // While searching every matching branch is shown open.
        if (hasChildren && (q || expanded.has(node.id))) walk(node.children ?? [], level + 1, [...path, node]);
      }
    };
    walk(categories, 1, []);
    return out;
  }, [categories, expanded, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${treeId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, treeId]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function toggle(node: CategoryNode, force?: boolean) {
    setExpanded((current) => {
      const next = new Set(current);
      const shouldOpen = force ?? !next.has(node.id);
      if (shouldOpen) next.add(node.id);
      else next.delete(node.id);
      return next;
    });
  }

  function pick(row: Row) {
    if (row.hasChildren) {
      if (!query) toggle(row.node);
      return;
    }
    const top = row.path[0] ?? row.node;
    const sub = row.path[0] ? (row.path[1] ?? row.node) : null;
    onChange({ category: top.slug, subcategory: sub?.slug ?? '' });
    close();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const row = rows[active];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((index) => Math.min(index + 1, rows.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'ArrowRight' && open && row?.hasChildren && !query) {
      event.preventDefault();
      toggle(row.node, true);
    } else if (event.key === 'ArrowLeft' && open && row && !query) {
      event.preventDefault();
      if (row.hasChildren && expanded.has(row.node.id)) toggle(row.node, false);
      else if (row.path.length) setActive(rows.findIndex((item) => item.node.id === row.path[row.path.length - 1].id));
    } else if (event.key === 'Enter' && open && row) {
      event.preventDefault();
      pick(row);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        // Tabbing (or clicking) out of the field closes the list.
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close();
      }}
      className={`adm-combo adm-combo--tree${open ? ' is-open' : ''}${invalid ? ' is-invalid' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="adm-combo__control" onMouseDown={(event) => {
        if (disabled || event.target === inputRef.current) return;
        event.preventDefault();
        setOpen((value) => !value);
        inputRef.current?.focus();
      }}>
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-label="Kategori"
          aria-expanded={open}
          aria-controls={treeId}
          aria-autocomplete="list"
          aria-activedescendant={open && rows[active] ? `${treeId}-${active}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="adm-combo__input"
          placeholder={placeholder}
          value={open ? query : selectedLabel}
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
        <ul id={treeId} role="tree" aria-label="Kategoriler" className="adm-combo__list adm-tree">
          {rows.length ? (
            rows.map((row, index) => {
              const isOpen = Boolean(query) || expanded.has(row.node.id);
              const isSelected = row.hasChildren ? false : row.path.length ? row.node.slug === subcategory && row.path[0].slug === category : row.node.slug === category && !subcategory;
              return (
                <li
                  key={row.node.id}
                  id={`${treeId}-${index}`}
                  role="treeitem"
                  aria-level={row.level}
                  aria-expanded={row.hasChildren ? isOpen : undefined}
                  aria-selected={row.hasChildren ? undefined : isSelected}
                  className={`adm-tree__row${row.hasChildren ? ' is-branch' : ''}${index === active ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                  style={{ '--tree-level': row.level - 1 } as React.CSSProperties}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(row)}
                >
                  {row.hasChildren ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`adm-tree__toggle${isOpen ? ' is-open' : ''}`}
                      aria-label={`${row.node.name} ${isOpen ? 'kapat' : 'aç'}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!query) toggle(row.node);
                      }}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                    </button>
                  ) : (
                    <span className="adm-tree__spacer" aria-hidden="true" />
                  )}
                  <span className="adm-tree__label">{row.node.name}</span>
                </li>
              );
            })
          ) : (
            <li className="adm-combo__empty" role="presentation">Kategori bulunamadı</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
