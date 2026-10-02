'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Dialog from '@/components/ui/Dialog';
import { slugifyCategory } from '@/lib/category-utils';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  displayOrder: number;
  image: string | null;
  isActive: boolean;
  productCount?: number;
  children?: Category[];
};

/** Images already in /public that suit a category card; picking one fills the image field. */
const IMAGE_PRESETS = [
  { label: 'Portre', url: '/assets/campaign-portrait.jpeg' },
  { label: 'Kampanya', url: '/assets/campaign-hero.jpeg' },
  { label: 'Oturan', url: '/assets/campaign-seated.jpeg' },
  { label: 'Tül takım', url: '/assets/pembe-tul-takim.jpeg' },
  { label: 'Saten', url: '/assets/satin.webp' },
  { label: 'Dantel', url: '/assets/lace.webp' },
  { label: 'Beyaz crop', url: '/assets/beyaz-crop/1.png' },
  { label: 'Siyah crop', url: '/assets/siyah-crop/1.png' },
  { label: 'Askılı crop', url: '/assets/askili-crop/1.png' },
  { label: 'Pembe takım', url: '/assets/pembe-fitilli-takim.png' },
  { label: 'Mavi takım', url: '/assets/bebek-mavisi-takim.jpeg' },
] as const;

const includes = (value: string, needle: string) => value.toLocaleLowerCase('tr-TR').includes(needle);

export default function CategoriesTab({ onCategoryChanged }: { onCategoryChanged?: () => void }) {
  const [tree, setTree] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ category: Category | null; parentId: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { notice, success, error } = useTabNotice();
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await loadJson<{ categories: Category[] }>('/api/admin/categories', 'Kategoriler yüklenemedi.', (body) =>
        Array.isArray((body as { categories?: unknown } | null)?.categories),
      );
      setTree(data.categories);
    } catch (err) {
      setLoadError(errorText(err, 'Kategoriler yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = async (message: string) => {
    success(message);
    await load();
    onCategoryChanged?.();
  };

  const run = async (id: string, action: () => Promise<void>, fallback: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await action();
    } catch (err) {
      error(errorText(err, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (category: Category) =>
    run(
      category.id,
      async () => {
        await sendJson('/api/admin/categories', 'PATCH', { id: category.id, isActive: !category.isActive }, 'Durum güncellenemedi.');
        await changed(`${category.name} ${category.isActive ? 'mağazada gizlendi' : 'mağazada gösteriliyor'}.`);
      },
      'Durum güncellenemedi.',
    );

  const move = (category: Category, list: Category[], direction: -1 | 1) => {
    const index = list.findIndex((item) => item.id === category.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    const ordered = [...list];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    return run(
      category.id,
      async () => {
        await sendJson('/api/admin/categories', 'PATCH', { orderedIds: ordered.map((item) => item.id) }, 'Sıralama güncellenemedi.');
        await changed(`${category.name} ${direction < 0 ? 'yukarı' : 'aşağı'} taşındı.`);
      },
      'Sıralama güncellenemedi.',
    );
  };

  const remove = (category: Category) => {
    const childCount = category.children?.length ?? 0;
    const productCount = category.productCount ?? 0;
    if (childCount > 0) {
      error(`${category.name} silinemez: altında ${childCount} alt kategori var. Önce onları silin ya da başka bir kategoriye taşıyın.`);
      return;
    }
    if (productCount > 0) {
      error(`${category.name} silinemez: ${productCount} ürün bu kategoriye bağlı. Önce ürünlerin kategorisini değiştirin.`);
      return;
    }
    ask({
      title: `${category.name} silinsin mi?`,
      message: <p>Kategori ve mağazadaki /{category.slug} sayfası kaldırılır. Bu işlem geri alınamaz.</p>,
      confirmLabel: 'Kategoriyi sil',
      pendingLabel: 'Siliniyor',
      danger: true,
      onConfirm: async () => {
        await sendJson(`/api/admin/categories?id=${encodeURIComponent(category.id)}`, 'DELETE', undefined, 'Kategori silinemedi.');
        await changed(`${category.name} silindi.`);
      },
    });
  };

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setTree(null); void load(); }} />;
  if (!tree) return <TabLoading label="Kategoriler yükleniyor" />;

  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const visible = needle
    ? tree
        .map((root) => {
          if (includes(root.name, needle) || includes(root.slug, needle)) return root;
          const children = root.children?.filter((child) => includes(child.name, needle) || includes(child.slug, needle)) ?? [];
          return children.length ? { ...root, children } : null;
        })
        .filter((root): root is Category => root !== null)
    : tree;
  const subCount = tree.reduce((sum, root) => sum + (root.children?.length ?? 0), 0);
  const allCollapsed = tree.length > 0 && tree.every((root) => collapsed[root.id]);

  return (
    <div className="adm-tab">
      <div className="adm-tab__head">
        <p className="adm-tab__summary">{tree.length ? `${tree.length} ana kategori · ${subCount} alt kategori` : 'Henüz kategori yok'}</p>
        <button type="button" className="adm-pill" onClick={() => setEditing({ category: null, parentId: '' })}>
          <span>Yeni ana kategori</span>
          <span className="adm-pill__icon" aria-hidden="true">
            <AdminIcon name="plus" />
          </span>
        </button>
      </div>

      {tree.length > 0 ? (
        <div className="adm-toolbar">
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Kategori ara</span>
            <AdminIcon name="search" />
            <input type="search" placeholder="Kategori adı veya bağlantı" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="adm-toolbar__end">
            <button
              type="button"
              className="adm-btn adm-btn--sm adm-btn--quiet"
              onClick={() => setCollapsed(allCollapsed ? {} : Object.fromEntries(tree.map((root) => [root.id, true])))}
            >
              {allCollapsed ? 'Tümünü aç' : 'Tümünü kapat'}
            </button>
          </div>
        </div>
      ) : null}

      {notice}

      {tree.length === 0 ? (
        <p className="adm-empty">Kategori yok. “Yeni ana kategori” ile mağaza menüsünün ilk bölümünü oluşturun.</p>
      ) : visible.length === 0 ? (
        <p className="adm-empty">“{search}” ile eşleşen kategori yok.</p>
      ) : (
        <ul className="adm-cat-list">
          {visible.map((root, rootIndex) => {
            const children = root.children ?? [];
            const open = needle ? true : !collapsed[root.id];
            const panelId = `cat-panel-${root.id}`;
            return (
              <li key={root.id} className="adm-card">
                <div className="adm-card__core adm-cat">
                  <div className="adm-cat__row">
                    <button
                      type="button"
                      className="adm-cat__toggle"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setCollapsed((current) => ({ ...current, [root.id]: !current[root.id] }))}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                      <span className="visually-hidden">{open ? `${root.name} alt kategorilerini gizle` : `${root.name} alt kategorilerini göster`}</span>
                    </button>
                    <CategoryThumb category={root} />
                    <div className="adm-cat__main">
                      <h3 className="adm-cat__name">
                        {root.name} <code className="adm-cat__slug">/{root.slug}</code>
                      </h3>
                      <p className="adm-cell__sub">
                        {children.length} alt kategori · {root.productCount ?? 0} ürün
                        {root.description ? ` · ${root.description}` : ''}
                      </p>
                    </div>
                    <CategoryActions
                      category={root}
                      busy={busyId === root.id}
                      disabled={Boolean(busyId)}
                      canUp={!needle && rootIndex > 0}
                      canDown={!needle && rootIndex < tree.length - 1}
                      onUp={() => move(root, tree, -1)}
                      onDown={() => move(root, tree, 1)}
                      onToggle={() => toggleActive(root)}
                      onEdit={() => setEditing({ category: root, parentId: '' })}
                      onDelete={() => remove(root)}
                      storefrontHref={`/${root.slug}`}
                    />
                  </div>

                  <div id={panelId} hidden={!open} className="adm-cat__panel">
                    {children.length ? (
                      <ul className="adm-cat__children">
                        {children.map((child, childIndex) => (
                          <li key={child.id} className="adm-cat__row adm-cat__row--child">
                            <CategoryThumb category={child} />
                            <div className="adm-cat__main">
                              <p className="adm-cat__child-name">
                                {child.name} <code className="adm-cat__slug">{child.slug}</code>
                              </p>
                              <p className="adm-cell__sub">
                                {child.productCount ?? 0} ürün{child.description ? ` · ${child.description}` : ''}
                              </p>
                            </div>
                            <CategoryActions
                              category={child}
                              busy={busyId === child.id}
                              disabled={Boolean(busyId)}
                              canUp={!needle && childIndex > 0}
                              canDown={!needle && childIndex < children.length - 1}
                              onUp={() => move(child, root.children ?? [], -1)}
                              onDown={() => move(child, root.children ?? [], 1)}
                              onToggle={() => toggleActive(child)}
                              onEdit={() => setEditing({ category: child, parentId: root.id })}
                              onDelete={() => remove(child)}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="adm-cell__sub adm-cat__none">Alt kategori yok.</p>
                    )}
                    <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-cat__add" onClick={() => setEditing({ category: null, parentId: root.id })}>
                      <AdminIcon name="plus" />
                      <span>
                        Alt kategori ekle<span className="visually-hidden">: {root.name}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <CategoryDialog
          key={editing.category?.id ?? `new-${editing.parentId}`}
          category={editing.category}
          defaultParentId={editing.parentId}
          defaultOrder={editing.parentId ? (tree.find((root) => root.id === editing.parentId)?.children?.length ?? 0) : tree.length}
          roots={tree}
          onClose={() => setEditing(null)}
          onSaved={async (name, created) => {
            setEditing(null);
            await changed(created ? `${name} oluşturuldu.` : `${name} güncellendi.`);
          }}
        />
      ) : null}
      {dialog}
    </div>
  );
}

function CategoryThumb({ category }: { category: Category }) {
  return (
    <span className="adm-cat__thumb" aria-hidden="true">
      {category.image ? <img src={category.image} alt="" loading="lazy" /> : null}
    </span>
  );
}

function CategoryActions({
  category,
  busy,
  disabled,
  canUp,
  canDown,
  onUp,
  onDown,
  onToggle,
  onEdit,
  onDelete,
  storefrontHref,
}: {
  category: Category;
  busy: boolean;
  disabled: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp(): void;
  onDown(): void;
  onToggle(): void;
  onEdit(): void;
  onDelete(): void;
  storefrontHref?: string;
}) {
  return (
    <div className="adm-cat__actions" aria-busy={busy}>
      <span className={`adm-status adm-status--${category.isActive ? 'success' : 'muted'}`}>{category.isActive ? 'Mağazada' : 'Gizli'}</span>
      <div className="adm-cat__order" role="group" aria-label={`${category.name} sırası`}>
        <button type="button" className="adm-icon-btn" onClick={onUp} disabled={disabled || !canUp} aria-label={`${category.name}: yukarı taşı`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>
        <button type="button" className="adm-icon-btn" onClick={onDown} disabled={disabled || !canDown} aria-label={`${category.name}: aşağı taşı`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      <button type="button" className="adm-btn adm-btn--sm" onClick={onToggle} disabled={disabled}>
        {busy ? 'Kaydediliyor' : category.isActive ? 'Gizle' : 'Göster'}
        <span className="visually-hidden"> {category.name}</span>
      </button>
      <button type="button" className="adm-btn adm-btn--sm" onClick={onEdit} disabled={disabled}>
        Düzenle<span className="visually-hidden"> {category.name}</span>
      </button>
      {storefrontHref ? (
        <Link href={storefrontHref} target="_blank" rel="noopener" className="adm-icon-btn" aria-label={`${category.name}: mağazada aç (yeni sekme)`}>
          <AdminIcon name="arrow" />
        </Link>
      ) : null}
      <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={onDelete} disabled={disabled} aria-label={`${category.name}: sil`}>
        <AdminIcon name="trash" />
      </button>
    </div>
  );
}

function CategoryDialog({
  category,
  defaultParentId,
  defaultOrder,
  roots,
  onClose,
  onSaved,
}: {
  category: Category | null;
  defaultParentId: string;
  defaultOrder: number;
  roots: Category[];
  onClose(): void;
  onSaved(name: string, created: boolean): void;
}) {
  const creating = !category;
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!creating);
  const [description, setDescription] = useState(category?.description ?? '');
  const [image, setImage] = useState(category?.image ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? defaultParentId);
  const [displayOrder, setDisplayOrder] = useState(String(category?.displayOrder ?? defaultOrder));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parentSlug = parentId ? roots.find((root) => root.id === parentId)?.slug : null;
  // A root that has children cannot become a child itself (two levels only).
  const canHaveParent = !category?.children?.length;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (!name.trim()) {
      setNameError('Kategori adını girin.');
      event.currentTarget.querySelector<HTMLInputElement>('#category-name')?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    const body = {
      ...(category ? { id: category.id } : {}),
      name: name.trim(),
      slug: slug.trim() || slugifyCategory(name),
      description: description.trim() || null,
      image: image.trim() || null,
      parentId: parentId || null,
      displayOrder: Number(displayOrder) || 0,
      isActive,
    };
    try {
      const data = await sendJson<{ category: Category }>(
        '/api/admin/categories',
        creating ? 'POST' : 'PATCH',
        body,
        creating ? 'Kategori oluşturulamadı.' : 'Kategori güncellenemedi.',
      );
      onSaved(data.category?.name ?? body.name, creating);
    } catch (err) {
      setFormError(errorText(err, 'Kategori kaydedilemedi.'));
      setPending(false);
    }
  };

  return (
    <Dialog open onClose={() => !pending && onClose()} title={creating ? (defaultParentId ? 'Yeni alt kategori' : 'Yeni ana kategori') : 'Kategoriyi düzenle'} className="adm-dialog" size="lg">
      <form className="adm-form" onSubmit={submit} noValidate>
        {canHaveParent ? (
          <div className="adm-field">
            <label htmlFor="category-parent">Üst kategori</label>
            <select id="category-parent" value={parentId} onChange={(e) => setParentId(e.target.value)} aria-describedby="category-parent-hint">
              <option value="">Yok — ana kategori</option>
              {roots
                .filter((root) => root.id !== category?.id)
                .map((root) => (
                  <option key={root.id} value={root.id}>
                    {root.name}
                  </option>
                ))}
            </select>
            <p id="category-parent-hint" className="adm-field__hint">
              {parentId ? 'Seçili kategorinin sayfasında filtre olarak görünür.' : 'Mağaza menüsünde kendi sayfasıyla görünür.'}
            </p>
          </div>
        ) : null}

        <div className="adm-form__grid">
          <div className="adm-field">
            <label htmlFor="category-name">Ad</label>
            <input
              id="category-name"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
                if (!slugTouched) setSlug(slugifyCategory(e.target.value));
              }}
              aria-invalid={Boolean(nameError) || undefined}
              aria-describedby={nameError ? 'category-name-error' : undefined}
            />
            {nameError ? (
              <p id="category-name-error" className="adm-field-error">
                {nameError}
              </p>
            ) : null}
          </div>
          <div className="adm-field">
            <label htmlFor="category-slug">Bağlantı</label>
            <input
              id="category-slug"
              autoComplete="off"
              spellCheck={false}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              aria-describedby="category-slug-hint"
            />
            <p id="category-slug-hint" className="adm-field__hint">
              Adres: {parentSlug ? `/${parentSlug}/` : '/'}
              {slug || slugifyCategory(name) || '…'} {slugTouched ? '' : '(addan oluşturuluyor)'}
            </p>
          </div>
        </div>

        <div className="adm-field">
          <label htmlFor="category-description">Açıklama</label>
          <textarea id="category-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} aria-describedby="category-description-hint" />
          <p id="category-description-hint" className="adm-field__hint">
            Kategori sayfasının başlığı altında ve arama motoru açıklamasında kullanılır.
          </p>
        </div>

        <div className="adm-field">
          <label htmlFor="category-image">Görsel (isteğe bağlı)</label>
          <input id="category-image" autoComplete="off" spellCheck={false} value={image} onChange={(e) => setImage(e.target.value)} aria-describedby="category-image-hint" />
          <p id="category-image-hint" className="adm-field__hint">
            Görselli kategori mağazada fotoğraflı kart, görselsiz kategori metin düğmesi olarak listelenir. /assets/… veya https://… adresi.
          </p>
          <div className="adm-chip-list" role="group" aria-label="Hazır görseller">
            {IMAGE_PRESETS.map((preset) => (
              <button key={preset.url} type="button" className="adm-chip" aria-pressed={image === preset.url} onClick={() => setImage(preset.url)}>
                {preset.label}
              </button>
            ))}
            {image ? (
              <button type="button" className="adm-chip" onClick={() => setImage('')}>
                Görseli kaldır
              </button>
            ) : null}
          </div>
          {image ? (
            <div className="adm-cat__preview">
              <img src={image} alt="" />
              <span className="adm-cell__sub">Önizleme: {name || 'Kategori adı'}</span>
            </div>
          ) : null}
        </div>

        <div className="adm-form__grid">
          <div className="adm-field">
            <label htmlFor="category-order">Sıra</label>
            <input id="category-order" type="number" inputMode="numeric" min={0} value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
          </div>
          <div className="adm-field adm-field--check">
            <input id="category-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} aria-describedby="category-active-hint" />
            <div>
              <label htmlFor="category-active">Mağazada göster</label>
              <p id="category-active-hint" className="adm-field__hint">
                Kapalıysa kategori sitede görünmez.
              </p>
            </div>
          </div>
        </div>

        {formError ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={pending}>
            Vazgeç
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={pending} aria-busy={pending}>
            {pending ? 'Kaydediliyor' : creating ? 'Kategoriyi oluştur' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
