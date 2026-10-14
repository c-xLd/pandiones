'use client';

import React from 'react';
import OrdersSkeleton from './skeletons/OrdersSkeleton';
import ProductsSkeleton from './skeletons/ProductsSkeleton';
import DashboardSkeleton from './skeletons/DashboardSkeleton';
import SettingsSkeleton from './skeletons/SettingsSkeleton';

function GenericTabSkeleton({ label }: { label: string }) {
  return (
    <div className="adm-tab" aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}
      </p>
      <div className="adm-toolbar" aria-hidden="true">
        <div className="adm-skel adm-toolbar__grow" style={{ height: '40px', borderRadius: 'var(--radius-md)' }} />
        <div className="adm-skel" style={{ width: '120px', height: '40px', borderRadius: 'var(--radius-md)' }} />
      </div>
      <div className="adm-table-wrap" aria-hidden="true">
        <div className="adm-table-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col"><span className="adm-skel" style={{ width: '80px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '140px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '90px', height: '14px' }} /></th>
                <th scope="col" className="adm-end"><span className="adm-skel" style={{ width: '60px', height: '14px', marginLeft: 'auto' }} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><span className="adm-skel" style={{ width: '110px', height: '16px' }} /></td>
                  <td><span className="adm-skel" style={{ width: '160px', height: '14px' }} /></td>
                  <td><span className="adm-skel" style={{ width: '80px', height: '24px', borderRadius: 'var(--radius-full)' }} /></td>
                  <td className="adm-end"><span className="adm-skel" style={{ width: '70px', height: '32px', borderRadius: 'var(--radius-md)', marginLeft: 'auto' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** 1:1 Geometric loading surface for tabs: replaces the old 3-gray-boxes with zero-shift geometric layouts. */
export function TabLoading({ label, tab }: { label: string; tab?: string }) {
  const norm = (label || '').toLocaleLowerCase('tr-TR');

  // Exact geometric tab skeletons (zero layout shift on tab transition)
  if (tab === 'orders' || norm.startsWith('siparişler')) {
    return <OrdersSkeleton />;
  }
  if (tab === 'products' || norm.startsWith('ürünler')) {
    return <ProductsSkeleton />;
  }
  if (tab === 'dashboard' || norm.includes('gösterge') || norm.includes('panel')) {
    return <DashboardSkeleton />;
  }
  if (tab === 'settings' || norm.includes('ayar')) {
    return <SettingsSkeleton />;
  }

  // Scoped sub-component / dialog / editor loading (never inject full tab tables inside small dialogs)
  if (norm.includes('sipariş')) {
    return (
      <div className="adm-state" role="status" aria-live="polite">
        <span className="visually-hidden">{label}</span>
        <div className="adm-state__rows" aria-hidden="true" style={{ padding: 'var(--space-6) 0' }}>
          <span className="adm-skel" style={{ width: '60%', height: '24px', marginBottom: '12px' }} />
          <span className="adm-skel" style={{ width: '100%', height: '80px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }} />
          <span className="adm-skel" style={{ width: '80%', height: '40px', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    );
  }
  if (norm.includes('ürün')) {
    return (
      <div className="adm-state" role="status" aria-live="polite">
        <span className="visually-hidden">{label}</span>
        <div className="adm-state__rows" aria-hidden="true" style={{ padding: 'var(--space-6) 0' }}>
          <span className="adm-skel" style={{ width: '40%', height: '28px', marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <span className="adm-skel" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-md)' }} />
            <span className="adm-skel" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-md)' }} />
          </div>
          <span className="adm-skel" style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    );
  }

  return <GenericTabSkeleton label={label} />;
}

/** A failed load is an error with a retry, never an empty list. */
export function TabLoadError({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div className="adm-state adm-state--error" role="alert">
      <p>{message}</p>
      <button type="button" className="adm-btn" onClick={onRetry}>
        Tekrar dene
      </button>
    </div>
  );
}
