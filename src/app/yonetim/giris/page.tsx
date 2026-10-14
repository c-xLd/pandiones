'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminLogin from '../_components/AdminLogin';
import AdminShellSkeleton from '../_components/AdminShellSkeleton';
import '@/styles/pages/admin-shell.css';

const NOTICES: Record<string, string> = {
  idle: '30 dakika işlem yapılmadığı için oturumunuz kapandı. Yeniden giriş yapın.',
  expired: '8 saatlik oturum süresi doldu. Yeniden giriş yapın.',
  oturum: 'Yönetim oturumunuz sona erdi. Yeniden giriş yapın.',
};

/** Admin sign-in (password → 2FA). /yonetim itself answers 404 without an admin session. */
function AdminLoginRoute() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const reason = useSearchParams().get('neden') ?? '';

  useEffect(() => {
    if (!loading && user?.role === 'ADMIN') router.replace('/yonetim');
  }, [loading, user, router]);

  // The panel skeleton only while an admin is being sent to the panel; everyone else gets the form at once,
  // also while the session check is still running (it only adds the "signed in as" line).
  if (!loading && user?.role === 'ADMIN') return <AdminShellSkeleton />;
  return <AdminLogin signedInAs={user ? user.email : null} onSignOut={logout} notice={NOTICES[reason] ?? null} />;
}

export default function AdminLoginPage() {
  return (
    // The static HTML is this fallback: the form itself, not a panel skeleton (no notice until the query is read).
    <Suspense fallback={<AdminLogin signedInAs={null} onSignOut={() => {}} notice={null} />}>
      <AdminLoginRoute />
    </Suspense>
  );
}
