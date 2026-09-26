'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { slugifyCategory } from '@/lib/category-utils';

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  displayOrder: number;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  children?: CategoryItem[];
}

interface CategoryManagerProps {
  onCategoryChanged?: () => void;
}

export default function CategoryManager({ onCategoryChanged }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allFlat, setAllFlat] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState<string>('');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (!res.ok) throw new Error('Kategoriler yüklenemedi.');
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
        // Expand all by default if first load
        setExpanded((prev) => {
          if (Object.keys(prev).length === 0) {
            const exp: { [id: string]: boolean } = {};
            data.categories.forEach((c: CategoryItem) => { exp[c.id] = true; });
            return exp;
          }
          return prev;
        });
      }
      if (Array.isArray(data.all)) {
        setAllFlat(data.all);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filtered categories according to search query
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories
      .map((cat) => {
        const matchRoot = cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);
        const matchingChildren = cat.children?.filter(
          (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
        );
        if (matchRoot) return cat;
        if (matchingChildren && matchingChildren.length > 0) {
          return { ...cat, children: matchingChildren };
        }
        return null;
      })
      .filter((cat): cat is CategoryItem => cat !== null);
  }, [categories, search]);

  // Overall Statistics
  const totalRoots = categories.length;
  const totalSubs = categories.reduce((acc, c) => acc + (c.children?.length || 0), 0);
  const totalProducts = categories.reduce(
    (acc, c) => acc + (c.productCount || 0) + (c.children?.reduce((sAcc, s) => sAcc + (s.productCount || 0), 0) || 0),
    0
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (open: boolean) => {
    const next: { [id: string]: boolean } = {};
    categories.forEach((c) => { next[c.id] = open; });
    setExpanded(next);
  };

  // Open Create Modal
  const openCreateModal = (defaultParentId: string = '') => {
    setModalMode('create');
    setEditingId(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormImage('');
    setFormParentId(defaultParentId);
    setFormDisplayOrder(defaultParentId ? 0 : categories.length);
    setFormIsActive(true);
    setIsSlugManuallyEdited(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cat: CategoryItem) => {
    setModalMode('edit');
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || '');
    setFormImage(cat.image || '');
    setFormParentId(cat.parentId || '');
    setFormDisplayOrder(cat.displayOrder);
    setFormIsActive(cat.isActive);
    setIsSlugManuallyEdited(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Live slug auto-generation
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!isSlugManuallyEdited) {
      setFormSlug(slugifyCategory(val));
    }
  };

  // Save Category Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Lütfen kategori adını girin.');
      return;
    }
    const finalSlug = formSlug.trim() || slugifyCategory(formName);
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            slug: finalSlug,
            description: formDescription.trim() || null,
            image: formImage.trim() || null,
            parentId: formParentId || null,
            displayOrder: Number(formDisplayOrder) || 0,
            isActive: formIsActive,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Kategori oluşturulamadı.');
        showToast(`✓ "${data.category.name}" kategorisi başarıyla oluşturuldu.`);
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            name: formName.trim(),
            slug: finalSlug,
            description: formDescription.trim() || null,
            image: formImage.trim() || null,
            parentId: formParentId || null,
            displayOrder: Number(formDisplayOrder) || 0,
            isActive: formIsActive,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Kategori güncellenemedi.');
        showToast(`✓ "${data.category.name}" kategorisi güncellendi.`);
      }

      setIsModalOpen(false);
      await fetchCategories();
      onCategoryChanged?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fast Toggle Active / Passive
  const handleToggleActive = async (cat: CategoryItem) => {
    try {
      const nextActive = !cat.isActive;
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, isActive: nextActive }),
      });
      if (!res.ok) throw new Error('Durum güncellenemedi.');
      showToast(`✓ "${cat.name}" ${nextActive ? 'aktif' : 'pasif'} duruma getirildi.`);
      await fetchCategories();
      onCategoryChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Durum güncellenemedi.');
    }
  };

  // Reorder Item (Up / Down)
  const handleReorder = async (cat: CategoryItem, direction: 'up' | 'down', list: CategoryItem[]) => {
    const currentIndex = list.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      const orderedIds = reordered.map((c) => c.id);
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error('Sıralama güncellenemedi.');
      showToast('✓ Sıralama güncellendi.');
      await fetchCategories();
      onCategoryChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sıralama hatası.');
    }
  };

  // Delete Category with Safety Check
  const handleDelete = async (cat: CategoryItem) => {
    const subCount = cat.children?.length || 0;
    const prodCount = cat.productCount || 0;

    if (subCount > 0) {
      alert(
        `"${cat.name}" kategorisinin altında ${subCount} adet alt kategori bulunmaktadır.\n\nÖnce alt kategorileri silmeli veya başka bir üst kategoriye taşımalısınız.`
      );
      return;
    }

    if (prodCount > 0) {
      alert(
        `"${cat.name}" kategorisine bağlı ${prodCount} adet ürün bulunmaktadır.\n\nÜrünlerin silinmesini veya sahipsiz kalmasını önlemek için önce ürünlerin kategorisini değiştirin.`
      );
      return;
    }

    if (!confirm(`"${cat.name}" kategorisini kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(cat.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Kategori silinemedi.');
      showToast(`✓ "${cat.name}" silindi.`);
      await fetchCategories();
      onCategoryChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme hatası.');
    }
  };

  return (
    <div className="category-manager-container" style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--ink, #111)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '20px', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ana Kategoriler
          </p>
          <h3 style={{ margin: 0, font: '400 28px var(--serif)' }}>{totalRoots}</h3>
          <span style={{ fontSize: '12px', color: '#16a34a' }}>Mağaza vitrin rotası</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '20px', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Toplam Alt Kategori
          </p>
          <h3 style={{ margin: 0, font: '400 28px var(--serif)' }}>{totalSubs}</h3>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Koleksiyon filtreleme dalları</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '20px', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sistemdeki Toplam Kategori
          </p>
          <h3 style={{ margin: 0, font: '400 28px var(--serif)' }}>{totalRoots + totalSubs}</h3>
          <span style={{ fontSize: '12px', color: '#2563eb' }}>Intimissimi standart hiyerarşi</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '20px', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Kategorize Edilmiş Parçalar
          </p>
          <h3 style={{ margin: 0, font: '400 28px var(--serif)' }}>{totalProducts}</h3>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Veritabanı bağlı ürün</span>
        </div>
      </div>

      {/* Action Header & Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '440px' }}>
          <input
            type="search"
            placeholder="Kategori veya alt kategori ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none',
              background: '#fff',
            }}
          />
          <svg
            style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--muted)' }}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="apple-press"
            onClick={() => toggleAll(true)}
            style={{
              fontSize: '12px',
              padding: '8px 14px',
              border: '1px solid var(--line)',
              background: '#fff',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            ▼ Tümünü Genişlet
          </button>
          <button
            type="button"
            className="apple-press"
            onClick={() => toggleAll(false)}
            style={{
              fontSize: '12px',
              padding: '8px 14px',
              border: '1px solid var(--line)',
              background: '#fff',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            ▲ Daralt
          </button>
          <button
            type="button"
            className="apple-press"
            onClick={() => openCreateModal('')}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              padding: '9px 18px',
              background: 'var(--ink, #111)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>+</span> Yeni Ana Kategori
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
          Kategori ağacı yükleniyor...
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '20px', borderRadius: '4px' }}>
          {error}
          <button type="button" onClick={fetchCategories} style={{ marginLeft: '12px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Category Tree Accordions */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredCategories.map((root, rootIndex) => {
            const isExpanded = !!expanded[root.id];
            const subs = root.children || [];

            return (
              <div
                key={root.id}
                style={{
                  background: '#fff',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                {/* Root Category Header Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: isExpanded ? 'var(--surface, #faf9f6)' : '#fff',
                    borderBottom: isExpanded ? '1px solid var(--line)' : 'none',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                    {/* Expand/Collapse Toggle Button */}
                    <button
                      type="button"
                      className="apple-press"
                      onClick={() => toggleExpand(root.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${root.name} alt kategorilerini ${isExpanded ? 'gizle' : 'göster'}`}
                      style={{
                        background: 'none',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--ink)',
                      }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>

                    {/* Category Thumbnail / Pill Badge */}
                    {root.image ? (
                      <img
                        src={root.image}
                        alt=""
                        style={{
                          width: '36px',
                          height: '42px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span
                        title="Görseli yok - Mağazada sade metin hapı (pill) olarak listelenir"
                        style={{
                          width: '36px',
                          height: '42px',
                          borderRadius: '6px',
                          border: '1px dashed var(--line)',
                          background: '#fcfcfc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: 'var(--muted)',
                          flexShrink: 0,
                          fontWeight: 500,
                        }}
                      >
                        Hap
                      </span>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{root.name}</h4>
                        <span
                          style={{
                            fontSize: '11px',
                            background: '#f1f1f1',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            color: 'var(--muted)',
                            fontFamily: 'monospace',
                          }}
                        >
                          /{root.slug}
                        </span>
                        {!root.isActive && (
                          <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>
                            Pasif
                          </span>
                        )}
                      </div>
                      {root.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)', maxWidth: '520px' }}>
                          {root.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Subcategory & Product Count Badges */}
                    <span style={{ fontSize: '12px', color: 'var(--muted)', background: '#f5f5f5', padding: '4px 10px', borderRadius: '4px' }}>
                      {subs.length} Alt Kategori
                    </span>
                    <span style={{ fontSize: '12px', color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '4px', fontWeight: 500 }}>
                      {root.productCount || 0} Ürün
                    </span>

                    {/* Storefront Link */}
                    <Link
                      href={`/koleksiyon/${root.slug}`}
                      target="_blank"
                      title="Koleksiyon sayfasını mağazada gör"
                      style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', padding: '4px 8px', border: '1px solid var(--line)', borderRadius: '4px' }}
                    >
                      Mağazada Gör ↗
                    </Link>

                    {/* Order buttons */}
                    <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        disabled={rootIndex === 0}
                        onClick={() => handleReorder(root, 'up', categories)}
                        title="Yukarı taşı"
                        style={{ padding: '4px 8px', background: '#fff', border: 'none', borderRight: '1px solid var(--line)', cursor: rootIndex === 0 ? 'not-allowed' : 'pointer', opacity: rootIndex === 0 ? 0.3 : 1 }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={rootIndex === categories.length - 1}
                        onClick={() => handleReorder(root, 'down', categories)}
                        title="Aşağı taşı"
                        style={{ padding: '4px 8px', background: '#fff', border: 'none', cursor: rootIndex === categories.length - 1 ? 'not-allowed' : 'pointer', opacity: rootIndex === categories.length - 1 ? 0.3 : 1 }}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Active toggle */}
                    <button
                      type="button"
                      className="apple-press"
                      onClick={() => handleToggleActive(root)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 500,
                        border: '1px solid ' + (root.isActive ? '#86efac' : '#fca5a5'),
                        background: root.isActive ? '#f0fdf4' : '#fef2f2',
                        color: root.isActive ? '#15803d' : '#b91c1c',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {root.isActive ? '● Aktif' : '○ Pasif'}
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      className="apple-press"
                      onClick={() => openEditModal(root)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        border: '1px solid var(--line)',
                        background: '#fff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Düzenle
                    </button>

                    {/* Quick Add Subcategory */}
                    <button
                      type="button"
                      className="apple-press"
                      onClick={() => openCreateModal(root.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#0f172a',
                        fontWeight: 500,
                      }}
                    >
                      + Alt Kategori
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      className="apple-press"
                      onClick={() => handleDelete(root)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        color: '#dc2626',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Kategoriyi Sil"
                    >
                      Sil ✕
                    </button>
                  </div>
                </div>

                {/* Subcategories Accordion Panel */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px', background: '#fff' }}>
                    {subs.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: '#fbfbfb', border: '1px dashed var(--line)', borderRadius: '4px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--muted)' }}>
                          Bu kategorinin altında henüz alt kategori bulunmuyor.
                        </p>
                        <button
                          type="button"
                          className="apple-press"
                          onClick={() => openCreateModal(root.id)}
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            padding: '6px 14px',
                            background: 'var(--ink, #111)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          + İlk Alt Kategoriyi Ekle
                        </button>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px 12px', width: '40px' }}>Sıra</th>
                            <th style={{ padding: '8px 12px' }}>Alt Kategori Adı</th>
                            <th style={{ padding: '8px 12px' }}>Bağlantı (Slug)</th>
                            <th style={{ padding: '8px 12px' }}>Açıklama</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>Ürün</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>Durum</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map((sub, subIndex) => (
                            <tr
                              key={sub.id}
                              style={{
                                borderBottom: '1px solid #f0f0f0',
                                background: subIndex % 2 === 0 ? '#fafafa' : '#fff',
                              }}
                            >
                              <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '11px' }}>
                                #{sub.displayOrder + 1}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: 'var(--muted)' }}>↳</span>
                                  {sub.image ? (
                                    <img
                                      src={sub.image}
                                      alt=""
                                      style={{
                                        width: '26px',
                                        height: '32px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        border: '1px solid var(--line)',
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : (
                                    <span
                                      title="Görseli yok - Mağazada hap (pill) olarak görünür"
                                      style={{
                                        fontSize: '9px',
                                        background: '#f5f5f5',
                                        color: 'var(--muted)',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        border: '1px dashed var(--line)',
                                      }}
                                    >
                                      Hap
                                    </span>
                                  )}
                                  <span>{sub.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)' }}>
                                {sub.slug}
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', maxWidth: '300px' }}>
                                {sub.description || '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: (sub.productCount || 0) > 0 ? '#ecfdf5' : '#f5f5f5', color: (sub.productCount || 0) > 0 ? '#047857' : 'var(--muted)' }}>
                                  {sub.productCount || 0}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="apple-press"
                                  onClick={() => handleToggleActive(sub)}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: sub.isActive ? '#16a34a' : '#dc2626',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {sub.isActive ? '● Aktif' : '○ Pasif'}
                                </button>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                  {/* Order buttons */}
                                  <button
                                    type="button"
                                    disabled={subIndex === 0}
                                    onClick={() => handleReorder(sub, 'up', subs)}
                                    title="Yukarı taşı"
                                    style={{ padding: '2px 6px', fontSize: '10px', background: 'none', border: '1px solid var(--line)', borderRadius: '3px', cursor: subIndex === 0 ? 'not-allowed' : 'pointer', opacity: subIndex === 0 ? 0.3 : 1 }}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={subIndex === subs.length - 1}
                                    onClick={() => handleReorder(sub, 'down', subs)}
                                    title="Aşağı taşı"
                                    style={{ padding: '2px 6px', fontSize: '10px', background: 'none', border: '1px solid var(--line)', borderRadius: '3px', cursor: subIndex === subs.length - 1 ? 'not-allowed' : 'pointer', opacity: subIndex === subs.length - 1 ? 0.3 : 1 }}
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    className="apple-press"
                                    onClick={() => openEditModal(sub)}
                                    style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid var(--line)', background: '#fff', borderRadius: '3px', cursor: 'pointer' }}
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    type="button"
                                    className="apple-press"
                                    onClick={() => handleDelete(sub)}
                                    style={{ padding: '3px 6px', fontSize: '11px', color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '1px solid var(--line)' }}>
              Arama kriterlerine uygun kategori bulunamadı.
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT CATEGORY MODAL ── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            padding: '20px',
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsModalOpen(false); }}
        >
          <div
            className="modal-content"
            style={{
              background: '#fff',
              maxWidth: '520px',
              width: '100%',
              borderRadius: '8px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              animation: 'scaleUp 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid var(--line)',
                background: 'var(--surface)',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  KATALOG YÖNETİMİ
                </p>
                <h3 id="category-modal-title" style={{ margin: '4px 0 0', font: '400 20px var(--serif)' }}>
                  {modalMode === 'create' ? 'Yeni Kategori / Alt Kategori Ekle' : 'Kategoriyi Düzenle'}
                </h3>
              </div>
              <button
                type="button"
                className="apple-press"
                onClick={() => setIsModalOpen(false)}
                aria-label="Kapat"
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {formError && (
                <div role="alert" style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', borderRadius: '4px', marginBottom: '16px' }}>
                  {formError}
                </div>
              )}

              {/* Hierarchy: Root vs Subcategory */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Kategori Hiyerarşisi
                </label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: '#fff',
                  }}
                >
                  <option value="">● Ana Kategori Olarak Tanımla (Üst Seviye)</option>
                  <optgroup label="Bir Üst Kategoriye Bağla (Alt Kategori Yap)">
                    {categories
                      .filter((c) => c.id !== editingId)
                      .map((root) => (
                        <option key={root.id} value={root.id}>
                          ↳ {root.name} (/{root.slug})
                        </option>
                      ))}
                  </optgroup>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                  {formParentId ? 'Bu parça seçili üst kategorinin altında filtre olarak sunulacaktır.' : 'Mağaza ana gezinti menüsünde müstakil bir vitrin olarak açılır.'}
                </span>
              </div>

              {/* Name */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Kategori Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Sütyen, Bralet, Dantel Takımlar"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Slug */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500 }}>
                    Bağlantı Adresi (Slug) *
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {isSlugManuallyEdited ? 'Elle düzenlendi' : 'Otomatik oluşturuluyor'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ padding: '10px 12px', background: '#f5f5f5', border: '1px solid var(--line)', borderRight: 'none', borderRadius: '4px 0 0 4px', fontSize: '12px', color: 'var(--muted)' }}>
                    /koleksiyon/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="sutyen-bralet"
                    value={formSlug}
                    onChange={(e) => {
                      setFormSlug(e.target.value);
                      setIsSlugManuallyEdited(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid var(--line)',
                      borderRadius: '0 4px 4px 0',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Editoryal Açıklama (SEO &amp; Koleksiyon Başlığı)
                </label>
                <textarea
                  rows={2}
                  placeholder="İtalyan zarafeti ve balensiz doğal formlar..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Category Image (Optional) */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Kategori / Alt Kategori Görseli (Opsiyonel)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="/assets/campaign-hero.jpeg veya https://..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  {formImage && (
                    <button
                      type="button"
                      className="apple-press"
                      onClick={() => setFormImage('')}
                      style={{
                        padding: '8px 12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Kaldır (Hap Yap)
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', lineHeight: '1.4' }}>
                  💡 <strong>Görünüm Kuralı:</strong> Görsel eklendiğinde mağaza koleksiyonunda <em>üstteki fotoğraflı kart</em> olarak görünür; görsel eklenmezse <em>alttaki metin hapı (pill)</em> olarak listelenir.
                </div>

                {/* Quick Luxury Presets Selector */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', width: '100%', fontWeight: 500 }}>
                    Hızlı Seçim (Mevcut Görseller):
                  </span>
                  {[
                    { label: 'Portre (Sütyen)', url: '/assets/campaign-portrait.jpeg' },
                    { label: 'Hero (İç Giyim)', url: '/assets/campaign-hero.jpeg' },
                    { label: 'Oturan (Ev Giyim)', url: '/assets/campaign-seated.jpeg' },
                    { label: 'Tül Takım (Külot)', url: '/assets/pembe-tul-takim.jpeg' },
                    { label: 'Saf Saten', url: '/assets/satin.webp' },
                    { label: 'İtalyan Danteli', url: '/assets/lace.webp' },
                    { label: 'Beyaz Crop', url: '/assets/beyaz-crop/1.png' },
                    { label: 'Siyah Crop', url: '/assets/siyah-crop/1.png' },
                    { label: 'Askılı Bralet', url: '/assets/askili-crop/1.png' },
                    { label: 'Pembe Takım', url: '/assets/pembe-fitilli-takim.png' },
                    { label: 'Mavi Takım', url: '/assets/bebek-mavisi-takim.jpeg' },
                  ].map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setFormImage(preset.url)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        border: '1px solid ' + (formImage === preset.url ? '#111' : 'var(--line)'),
                        background: formImage === preset.url ? '#111' : '#fcfcfc',
                        color: formImage === preset.url ? '#fff' : 'var(--ink)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Live Preview Card */}
                {formImage && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      background: 'var(--surface, #faf9f6)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                    }}
                  >
                    <img
                      src={formImage}
                      alt="Önizleme"
                      style={{
                        width: '48px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                    <div style={{ flex: 1, fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', display: 'block' }}>
                        Canlı Önizleme: {formName || 'Kategori Adı'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#047857' }}>
                        ✓ Koleksiyonda fotoğraflı kart olarak gösterilecek
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Display Order & Active Checkbox */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Görünüm Sırası (Display Order)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Kategori Mağazada Aktif</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                    İşaret kaldırılırsa ön yüzde gizlenir.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <button
                  type="button"
                  className="apple-press"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
                    border: '1px solid var(--line)',
                    background: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="apple-press"
                  style={{
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: 'var(--ink, #111)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Kaydediliyor...' : modalMode === 'create' ? 'Kategoriyi Oluştur ↗' : 'Değişiklikleri Kaydet ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
