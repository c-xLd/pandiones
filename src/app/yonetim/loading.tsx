import React from 'react';
import '@/styles/pages/admin-shell.css';
import '@/styles/pages/admin-content.css';
import AdminShellSkeleton from './_components/AdminShellSkeleton';

/**
 * Yonetim route loading boundary: overrides the root vitrin skeleton with
 * the panel's own neutral geometric layout (sidebar + topbar + content skeleton).
 */
export default function YonetimLoading() {
  return <AdminShellSkeleton />;
}
