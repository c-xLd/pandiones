'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

type TabKey = 'siparisler' | 'favoriler' | 'iadeler' | 'profil' | 'adresler' | 'tercihler';

// Apple-calibrated minimalist SVG icons
const Icons = {
  Package: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Heart: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  RotateCcw: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  User: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  ),
  MapPin: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Mail: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Truck: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-5.2a2 2 0 0 0-.6-1.4L18.4 7.4a2 2 0 0 0-1.4-.6H14v11.2" />
      <circle cx="17" cy="18.5" r="2.5" />
      <circle cx="6.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Check: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Copy: ({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Printer: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect width="12" height="8" x="6" y="14" rx="1" />
    </svg>
  ),
  Search: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  ArrowUpRight: ({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  ),
  ShieldCheck: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Navigation: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  ),
  Compass: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  Plus: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Star: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const GOOGLE_PLACES_CATALOG = [
  { title: 'Keçeyolu Sokak', subtitle: 'Keçiören, Ankara', district: 'Keçiören', city: 'Ankara', address: 'Keçeyolu Sokak No: 14' },
  { title: 'Keçiören Belediyesi', subtitle: 'Keçiören, Ankara', district: 'Keçiören', city: 'Ankara', address: 'Kalaba Mah. Sanatoryum Cad. No: 1' },
  { title: 'Keçesuyu Caddesi', subtitle: 'Gaziosmanpaşa, İstanbul', district: 'Gaziosmanpaşa', city: 'İstanbul', address: 'Keçesuyu Caddesi No: 42' },
  { title: 'Keçilik Koyu', subtitle: 'Beykoz, İstanbul', district: 'Beykoz', city: 'İstanbul', address: 'Anadolu Kavağı Mah. Keçilik Koyu Mevkii' },
  { title: 'Keçiborlu', subtitle: 'Isparta', district: 'Keçiborlu', city: 'Isparta', address: 'Cumhuriyet Meydanı No: 5' },
  { title: 'Abdi İpekçi Caddesi', subtitle: 'Nişantaşı, Şişli, İstanbul', district: 'Şişli', city: 'İstanbul', address: 'Abdi İpekçi Caddesi No: 28' },
  { title: 'Bağdat Caddesi', subtitle: 'Kadıköy, İstanbul', district: 'Kadıköy', city: 'İstanbul', address: 'Bağdat Caddesi No: 342' },
  { title: 'Bebek Cevdet Paşa Caddesi', subtitle: 'Beşiktaş, İstanbul', district: 'Beşiktaş', city: 'İstanbul', address: 'Cevdet Paşa Caddesi No: 64' },
  { title: 'Tunalı Hilmi Caddesi', subtitle: 'Çankaya, Ankara', district: 'Çankaya', city: 'Ankara', address: 'Tunalı Hilmi Caddesi No: 88' },
  { title: 'Kordon Atatürk Caddesi', subtitle: 'Alsancak, Konak, İzmir', district: 'Konak', city: 'İzmir', address: 'Atatürk Caddesi No: 190' },
  { title: 'Yalıkavak Marina Caddesi', subtitle: 'Bodrum, Muğla', district: 'Bodrum', city: 'Muğla', address: 'Çökertme Cad. No: 14' },
  { title: 'Göktürk İstanbul Caddesi', subtitle: 'Eyüpsultan, İstanbul', district: 'Eyüpsultan', city: 'İstanbul', address: 'İstanbul Caddesi No: 18' },
  { title: 'Çeşme Marina', subtitle: 'Çeşme, İzmir', district: 'Çeşme', city: 'İzmir', address: '1016. Sokak No: 2/24' },
  { title: 'Kanyon AVM Büyükdere Caddesi', subtitle: 'Levent, Şişli, İstanbul', district: 'Şişli', city: 'İstanbul', address: 'Büyükdere Caddesi No: 185' },
  { title: 'Zorlu Center Levazım', subtitle: 'Beşiktaş, İstanbul', district: 'Beşiktaş', city: 'İstanbul', address: 'Levazım Mah. Koru Sok. No: 2' },
];

const ADDRESS_TITLES = [
  { key: 'Ev', label: 'Ev', icon: '🏠' },
  { key: 'İş', label: 'İş', icon: '💼' },
  { key: 'Yazlık', label: 'Yazlık', icon: '🏖️' },
  { key: 'Stüdyo', label: 'Stüdyo', icon: '🎨' },
  { key: 'Diğer', label: 'Diğer', icon: '📍' },
];

export default function HesabimPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();

  // Active Tab state (synced with hash if present)
  const [activeTab, setActiveTab] = useState<TabKey>('siparisler');

  // Search & filter for orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Return modal state
  const [returnModalOrder, setReturnModalOrder] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  // Profile Form state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Newsletter state
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [togglingNewsletter, setTogglingNewsletter] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Saved Addresses state from API
  const [dbAddresses, setDbAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Address Form state
  const [addrTitle, setAddrTitle] = useState('Ev');
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrAddress, setAddrAddress] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  // Google Haritalar Search & Autocomplete state
  const [googleQuery, setGoogleQuery] = useState('');
  const [showGoogleDropdown, setShowGoogleDropdown] = useState(false);

  // Sync tab with URL hash on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const validTabs: TabKey[] = ['siparisler', 'favoriler', 'iadeler', 'profil', 'adresler', 'tercihler'];
      if (validTabs.includes(hash as TabKey)) {
        setActiveTab(hash as TabKey);
      }
    }
  }, []);

  // Update URL hash when tab changes
  const switchTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tab}`);
    }
  }, []);

  // Sync profile form when user loads
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setIsSubscribed(Boolean(user.isSubscribedNewsletter));
    }
  }, [user]);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/giris-yap');
    }
  }, [user, loading, router]);

  // Keyboard accessibility: Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (returnModalOrder) setReturnModalOrder(null);
        if (addressModalOpen) setAddressModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [returnModalOrder, addressModalOpen]);

  // Format currency
  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Carrier tracking link generator
  const getCarrierTrackingUrl = (company?: string | null, code?: string | null) => {
    if (!code) return null;
    const cleanCode = encodeURIComponent(code.trim());
    const lowerCompany = (company || '').toLowerCase();

    if (lowerCompany.includes('yurtiçi') || lowerCompany.includes('yurtici')) {
      return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${cleanCode}`;
    }
    if (lowerCompany.includes('mng')) {
      return `https://www.mngkargo.com.tr/gonderitakip?k=${cleanCode}`;
    }
    if (lowerCompany.includes('aras')) {
      return `https://kargotakip.araskargo.com.tr/?code=${cleanCode}`;
    }
    if (lowerCompany.includes('kolay gelsin')) {
      return `https://esube.kolaygelsin.com/shipments?trackingId=${cleanCode}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent((company || 'Kargo') + ' ' + code)}`;
  };

  // Status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ODENDI':
        return (
          <span className="apple-badge apple-badge-blue">
            <span className="apple-badge-dot" /> Ödeme Alındı
          </span>
        );
      case 'HAZIRLANIYOR':
        return (
          <span className="apple-badge apple-badge-amber">
            <span className="apple-badge-dot" /> Hazırlanıyor
          </span>
        );
      case 'KARGODA':
        return (
          <span className="apple-badge apple-badge-purple">
            <span className="apple-badge-dot" /> Kargoda
          </span>
        );
      case 'TESLIM_EDILDI':
        return (
          <span className="apple-badge apple-badge-green">
            <span className="apple-badge-dot" /> Teslim Edildi
          </span>
        );
      case 'ODEME_BEKLENIYOR':
        return <span className="apple-badge apple-badge-gray">Ödeme Bekleniyor</span>;
      case 'ODEME_BASARISIZ':
        return <span className="apple-badge apple-badge-red">Ödeme Başarısız</span>;
      default:
        return <span className="apple-badge apple-badge-gray">{status}</span>;
    }
  };

  // Order Stepper progress index
  const getOrderProgressIndex = (status: string) => {
    switch (status) {
      case 'ODENDI':
        return 1;
      case 'HAZIRLANIYOR':
        return 2;
      case 'KARGODA':
        return 3;
      case 'TESLIM_EDILDI':
        return 4;
      default:
        return 0;
    }
  };

  // Distinct saved addresses from past orders
  const savedAddresses = useMemo(() => {
    if (!user?.orders || user.orders.length === 0) return [];
    const map = new Map<string, any>();
    for (const ord of user.orders) {
      if (ord.shippingAddress && ord.shippingCity) {
        const key = `${ord.shippingAddress}-${ord.shippingDistrict}-${ord.shippingCity}`.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            recipient: ord.customerName,
            phone: ord.customerPhone,
            address: ord.shippingAddress,
            district: ord.shippingDistrict,
            city: ord.shippingCity,
            lastUsed: ord.createdAt,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [user]);

  // All returns across orders
  const allUserReturns = useMemo(() => {
    if (!user?.orders) return [];
    const list: any[] = [];
    for (const ord of user.orders) {
      if (ord.returns && ord.returns.length > 0) {
        for (const ret of ord.returns) {
          list.push({ ...ret, orderNumber: ord.orderNumber, orderTotal: ord.totalAmount, orderDate: ord.createdAt });
        }
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [user]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!user?.orders) return [];
    return user.orders.filter((order: any) => {
      // Status filter
      if (orderStatusFilter !== 'ALL') {
        if (orderStatusFilter === 'ACTIVE' && !['ODENDI', 'HAZIRLANIYOR', 'KARGODA'].includes(order.status)) {
          return false;
        }
        if (orderStatusFilter === 'DELIVERED' && order.status !== 'TESLIM_EDILDI') {
          return false;
        }
        if (orderStatusFilter === 'RETURNS' && (!order.returns || order.returns.length === 0)) {
          return false;
        }
      }
      // Text search
      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase().trim();
        const matchesNumber = order.orderNumber.toLowerCase().includes(query);
        const matchesProduct = order.items?.some((it: any) => it.productName.toLowerCase().includes(query));
        return matchesNumber || matchesProduct;
      }
      return true;
    });
  }, [user, orderStatusFilter, orderSearch]);

  // Profile update submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          phone: profilePhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Profil güncellenemedi.');
      } else {
        setProfileSuccess(data.message || 'Profil bilgileriniz başarıyla kaydedildi.');
        await refreshUser();
      }
    } catch {
      setProfileError('Bağlantı hatası oluştu.');
    } finally {
      setSubmittingProfile(false);
    }
  };

  // Password update submit
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor.');
      setSubmittingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır.');
      setSubmittingPassword(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Şifre güncellenemedi.');
      } else {
        setPasswordSuccess(data.message || 'Şifreniz başarıyla güncellendi.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordError('Bağlantı hatası oluştu.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  // Newsletter toggle submit
  const handleToggleNewsletter = async () => {
    setTogglingNewsletter(true);
    setNewsletterMessage(null);
    try {
      const res = await fetch('/api/newsletter/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribe: !isSubscribed }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSubscribed(data.subscribed);
        setNewsletterMessage(data.message);
        await refreshUser();
      } else {
        setNewsletterMessage(data.error || 'İşlem gerçekleştirilemedi.');
      }
    } catch {
      setNewsletterMessage('Bağlantı hatası oluştu.');
    } finally {
      setTogglingNewsletter(false);
    }
  };

  // Remove from wishlist helper
  const handleRemoveWishlist = async (productId: string) => {
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      await refreshUser();
    } catch (e) {
      console.error('Failed to toggle wishlist:', e);
    }
  };

  // Return request submit
  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrder || !returnReason.trim()) return;

    setSubmittingReturn(true);
    setReturnError(null);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: returnModalOrder.id,
          customerEmail: user?.email,
          reason: returnReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReturnError(data.error || 'İade talebi oluşturulamadı.');
      } else {
        setReturnSuccess('İade talebiniz başarıyla iletildi. Hijyen kontrolü ve sipariş detayları incelenerek size dönüş yapılacaktır.');
        await refreshUser();
        setTimeout(() => {
          setReturnModalOrder(null);
          setReturnReason('');
          setReturnSuccess(null);
        }, 2800);
      }
    } catch {
      setReturnError('Bağlantı hatası oluştu.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Load addresses from API
  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const res = await fetch('/api/auth/addresses');
      if (res.ok) {
        const data = await res.json();
        setDbAddresses(data.addresses || []);
      }
    } catch (e) {
      console.error('Adresler yüklenemedi:', e);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user, loadAddresses]);

  // Open modal for new address
  const handleOpenNewAddress = () => {
    setEditingAddressId(null);
    setAddrTitle('Ev');
    setAddrRecipient(user?.name || '');
    setAddrPhone(user?.phone || '');
    setAddrAddress('');
    setAddrDistrict('');
    setAddrCity('');
    setAddrPostalCode('');
    setAddrIsDefault(dbAddresses.length === 0);
    setAddressError(null);
    setAddressSuccess(null);
    setGoogleQuery('');
    setShowGoogleDropdown(false);
    setAddressModalOpen(true);
  };

  // Open modal to edit existing address
  const handleOpenEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddrTitle(addr.title || 'Ev');
    setAddrRecipient(addr.recipient || '');
    setAddrPhone(addr.phone || '');
    setAddrAddress(addr.address || '');
    setAddrDistrict(addr.district || '');
    setAddrCity(addr.city || '');
    setAddrPostalCode(addr.postalCode || '');
    setAddrIsDefault(Boolean(addr.isDefault));
    setAddressError(null);
    setAddressSuccess(null);
    setGoogleQuery('');
    setShowGoogleDropdown(false);
    setAddressModalOpen(true);
  };

  // Google Places autocomplete filter
  const filteredGooglePlaces = useMemo(() => {
    if (!googleQuery.trim() || googleQuery.trim().length < 2) return [];
    const q = googleQuery.toLocaleLowerCase('tr-TR');
    return GOOGLE_PLACES_CATALOG.filter((p) => {
      const full = `${p.title} ${p.subtitle} ${p.district} ${p.city}`.toLocaleLowerCase('tr-TR');
      return full.includes(q);
    }).slice(0, 6);
  }, [googleQuery]);

  // Handle select Google place
  const handleSelectGooglePlace = (place: typeof GOOGLE_PLACES_CATALOG[0]) => {
    setAddrAddress(place.address);
    setAddrDistrict(place.district);
    setAddrCity(place.city);
    setGoogleQuery(`${place.title}, ${place.subtitle}`);
    setShowGoogleDropdown(false);
  };

  // Submit address (Add or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrRecipient.trim() || !addrPhone.trim() || !addrAddress.trim() || !addrDistrict.trim() || !addrCity.trim()) {
      setAddressError('Lütfen tüm zorunlu alanları (*) doldurunuz.');
      return;
    }

    setSubmittingAddress(true);
    setAddressError(null);
    setAddressSuccess(null);

    try {
      const method = editingAddressId ? 'PATCH' : 'POST';
      const payload: any = {
        title: addrTitle,
        recipient: addrRecipient.trim(),
        phone: addrPhone.trim(),
        address: addrAddress.trim(),
        district: addrDistrict.trim(),
        city: addrCity.trim(),
        postalCode: addrPostalCode.trim() || null,
        isDefault: addrIsDefault,
      };
      if (editingAddressId) {
        payload.id = editingAddressId;
      }

      const res = await fetch('/api/auth/addresses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddressError(data.error || 'Adres kaydedilemedi.');
      } else {
        setAddressSuccess(editingAddressId ? 'Adres başarıyla güncellendi.' : 'Yeni adres başarıyla kaydedildi.');
        await loadAddresses();
        setTimeout(() => {
          setAddressModalOpen(false);
          setAddressSuccess(null);
        }, 1100);
      }
    } catch {
      setAddressError('Bağlantı hatası oluştu.');
    } finally {
      setSubmittingAddress(false);
    }
  };

  // Set default address
  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch('/api/auth/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefault: true }),
      });
      if (res.ok) {
        await loadAddresses();
      }
    } catch (e) {
      console.error('Varsayılan adres güncellenemedi:', e);
    }
  };

  // Delete address
  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/auth/addresses?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadAddresses();
      }
    } catch (e) {
      console.error('Adres silinemedi:', e);
    }
  };

  // Google Maps navigation url
  const getGoogleNavUrl = (address: string, district: string, city: string) => {
    const dest = encodeURIComponent(`${address}, ${district}, ${city}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  };

  // Google Maps map view url
  const getGoogleMapUrl = (address: string, district: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${district}, ${city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  if (loading) {
    return (
      <main id="main" className="padded-main" style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '28px', height: '28px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--ink)', borderRadius: '50%', margin: '0 auto 16px', animation: 'appleSpin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
          <p style={{ color: 'var(--muted)', fontSize: '13px', letterSpacing: '0.04em' }}>Hesap alanı hazırlanıyor...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  // Compute metrics
  const totalOrdersCount = user.orders?.length || 0;
  const activeOrdersCount = user.orders?.filter((o: any) => ['ODENDI', 'HAZIRLANIYOR', 'KARGODA'].includes(o.status)).length || 0;
  const wishlistCount = user.wishlists?.length || 0;
  const returnsCount = allUserReturns.length;

  return (
    <main id="main" className="padded-main">
      {/* Apple-calibrated CSS rules for tactile response, springs & typography */}
      <style>{`
        @keyframes appleSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes modalSpringIn {
          0% { opacity: 0; transform: scale(0.96) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeInQuick {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .apple-press {
          transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), background-color 160ms ease, border-color 160ms ease, opacity 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .apple-press:active {
          transform: scale(0.975);
        }
        .apple-segmented-pill {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 13px;
          letter-spacing: 0.02em;
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 180ms cubic-bezier(0.2, 0, 0, 1);
        }
        .apple-segmented-pill:active {
          transform: scale(0.96);
        }
        .apple-segmented-pill.active {
          background: var(--ink);
          color: var(--paper);
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .apple-segmented-pill.inactive {
          background: transparent;
          color: var(--muted);
          border-color: transparent;
        }
        .apple-segmented-pill.inactive:hover {
          color: var(--ink);
          background: rgba(0, 0, 0, 0.04);
        }
        .apple-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.03em;
        }
        .apple-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .apple-badge-blue {
          background: #eff6ff;
          color: #1e40af;
        }
        .apple-badge-blue .apple-badge-dot {
          background: #3b82f6;
        }
        .apple-badge-amber {
          background: #fffbeb;
          color: #92400e;
        }
        .apple-badge-amber .apple-badge-dot {
          background: #f59e0b;
        }
        .apple-badge-purple {
          background: #f5f3ff;
          color: #5b21b6;
        }
        .apple-badge-purple .apple-badge-dot {
          background: #8b5cf6;
        }
        .apple-badge-green {
          background: #f0fdf4;
          color: #166534;
        }
        .apple-badge-green .apple-badge-dot {
          background: #22c55e;
        }
        .apple-badge-gray {
          background: var(--surface);
          color: var(--muted);
        }
        .apple-badge-gray .apple-badge-dot {
          background: var(--muted);
        }
        .apple-badge-red {
          background: #fef2f2;
          color: #991b1b;
        }
        .apple-badge-red .apple-badge-dot {
          background: #ef4444;
        }
        .apple-card {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 12px;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .apple-card:hover {
          border-color: rgba(32, 33, 32, 0.22);
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media print {
          header, footer, nav, .print-hide {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .apple-card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="site-container" style={{ margin: '32px auto 100px' }}>

        {/* Executive Header Card with Frosted Translucent Border */}
        <section aria-label="Kullanıcı Özeti" className="apple-card" style={{
          padding: 'clamp(24px, 3.5vw, 44px)',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '24px',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '28px',
            marginBottom: '28px',
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                  PANDIONES KİŞİSEL ALAN
                </span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--muted)' }} />
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Icons.ShieldCheck size={13} color="#166534" /> Doğrulanmış Hesap
                </span>
              </div>

              <h1 style={{
                font: '400 clamp(30px, 4.2vw, 46px)/1.15 var(--serif)',
                margin: '0 0 10px',
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
              }}>
                Merhaba, {user.name}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--muted)' }}>
                <span>{user.email}</span>
                {user.phone && <span>· {user.phone}</span>}
                {user.createdAt && (
                  <span style={{ background: 'var(--surface)', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', letterSpacing: '0.03em', color: 'var(--ink)' }}>
                    {new Date(user.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} tarihinden beri üye
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }} className="print-hide">
              {user.role === 'ADMIN' && (
                <Link
                  href="/yonetim"
                  className="apple-press"
                  style={{
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    padding: '10px 18px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    letterSpacing: '0.04em',
                    textDecoration: 'none',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Yönetim Paneli</span>
                  <Icons.ArrowUpRight size={13} color="currentColor" />
                </Link>
              )}
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
                className="apple-press"
                style={{
                  border: '1px solid var(--line)',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  letterSpacing: '0.03em',
                  background: 'transparent',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Çıkış Yap
              </button>
            </div>
          </div>

          {/* Apple-style Interactive Metric Tiles */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }} className="print-hide">
            <button
              type="button"
              onClick={() => {
                setOrderStatusFilter('ALL');
                switchTab('siparisler');
              }}
              className="apple-press"
              style={{
                background: activeTab === 'siparisler' && orderStatusFilter === 'ALL' ? 'var(--surface)' : 'rgba(0,0,0,0.015)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Toplam Sipariş</span>
                <Icons.Package size={15} />
              </div>
              <strong style={{ font: '600 26px/1.2 var(--sans)', color: 'var(--ink)' }}>
                {totalOrdersCount}
              </strong>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderStatusFilter('ACTIVE');
                switchTab('siparisler');
              }}
              className="apple-press"
              style={{
                background: activeTab === 'siparisler' && orderStatusFilter === 'ACTIVE' ? 'var(--surface)' : 'rgba(0,0,0,0.015)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Aktif Kargolar</span>
                <Icons.Truck size={15} color={activeOrdersCount > 0 ? '#2563eb' : 'currentColor'} />
              </div>
              <strong style={{ font: '600 26px/1.2 var(--sans)', color: activeOrdersCount > 0 ? '#2563eb' : 'var(--ink)' }}>
                {activeOrdersCount}
              </strong>
            </button>

            <button
              type="button"
              onClick={() => switchTab('favoriler')}
              className="apple-press"
              style={{
                background: activeTab === 'favoriler' ? 'var(--surface)' : 'rgba(0,0,0,0.015)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Kayıtlı Favoriler</span>
                <Icons.Heart size={15} />
              </div>
              <strong style={{ font: '600 26px/1.2 var(--sans)', color: 'var(--ink)' }}>
                {wishlistCount}
              </strong>
            </button>

            <button
              type="button"
              onClick={() => switchTab('iadeler')}
              className="apple-press"
              style={{
                background: activeTab === 'iadeler' ? 'var(--surface)' : 'rgba(0,0,0,0.015)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>İade Talepleri</span>
                <Icons.RotateCcw size={15} />
              </div>
              <strong style={{ font: '600 26px/1.2 var(--sans)', color: 'var(--ink)' }}>
                {returnsCount}
              </strong>
            </button>
          </div>
        </section>

        {/* Apple Segmented Pill Navigation */}
        <nav
          role="tablist"
          aria-label="Hesap Bölümleri"
          className="hide-scrollbar print-hide"
          style={{
            display: 'flex',
            gap: '8px',
            background: 'var(--surface)',
            padding: '6px',
            borderRadius: '9999px',
            marginBottom: '32px',
            overflowX: 'auto',
            border: '1px solid var(--line)',
            width: 'fit-content',
            maxWidth: '100%',
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'siparisler'}
            onClick={() => switchTab('siparisler')}
            className={`apple-segmented-pill ${activeTab === 'siparisler' ? 'active' : 'inactive'}`}
          >
            <Icons.Package size={14} color="currentColor" />
            <span>Siparişlerim</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: activeTab === 'siparisler' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
            }}>
              {totalOrdersCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'favoriler'}
            onClick={() => switchTab('favoriler')}
            className={`apple-segmented-pill ${activeTab === 'favoriler' ? 'active' : 'inactive'}`}
          >
            <Icons.Heart size={14} color="currentColor" />
            <span>Favorilerim</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: activeTab === 'favoriler' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
            }}>
              {wishlistCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'iadeler'}
            onClick={() => switchTab('iadeler')}
            className={`apple-segmented-pill ${activeTab === 'iadeler' ? 'active' : 'inactive'}`}
          >
            <Icons.RotateCcw size={14} color="currentColor" />
            <span>İade Taleplerim</span>
            {returnsCount > 0 && (
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: activeTab === 'iadeler' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
              }}>
                {returnsCount}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'profil'}
            onClick={() => switchTab('profil')}
            className={`apple-segmented-pill ${activeTab === 'profil' ? 'active' : 'inactive'}`}
          >
            <Icons.User size={14} color="currentColor" />
            <span>Profil & Güvenlik</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'adresler'}
            onClick={() => switchTab('adresler')}
            className={`apple-segmented-pill ${activeTab === 'adresler' ? 'active' : 'inactive'}`}
          >
            <Icons.MapPin size={14} color="currentColor" />
            <span>Kayıtlı Adresler</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'tercihler'}
            onClick={() => switchTab('tercihler')}
            className={`apple-segmented-pill ${activeTab === 'tercihler' ? 'active' : 'inactive'}`}
          >
            <Icons.Mail size={14} color="currentColor" />
            <span>İletişim Tercihleri</span>
          </button>
        </nav>

        {/* TAB 1: SIPARISLERIM */}
        {activeTab === 'siparisler' && (
          <div role="tabpanel" aria-label="Siparişlerim">
            {/* Filter and Search Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              marginBottom: '24px',
            }} className="print-hide">
              {/* Status chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('ALL')}
                  className="apple-press"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    background: orderStatusFilter === 'ALL' ? 'var(--ink)' : 'var(--paper)',
                    color: orderStatusFilter === 'ALL' ? 'var(--paper)' : 'var(--ink)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    borderRadius: '9999px',
                    fontWeight: 500,
                  }}
                >
                  Tümü ({totalOrdersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('ACTIVE')}
                  className="apple-press"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    background: orderStatusFilter === 'ACTIVE' ? 'var(--ink)' : 'var(--paper)',
                    color: orderStatusFilter === 'ACTIVE' ? 'var(--paper)' : 'var(--ink)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    borderRadius: '9999px',
                    fontWeight: 500,
                  }}
                >
                  Hazırlanıyor / Kargoda ({activeOrdersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('DELIVERED')}
                  className="apple-press"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    background: orderStatusFilter === 'DELIVERED' ? 'var(--ink)' : 'var(--paper)',
                    color: orderStatusFilter === 'DELIVERED' ? 'var(--paper)' : 'var(--ink)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    borderRadius: '9999px',
                    fontWeight: 500,
                  }}
                >
                  Teslim Edilenler
                </button>
                {returnsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('RETURNS')}
                    className="apple-press"
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      background: orderStatusFilter === 'RETURNS' ? 'var(--ink)' : 'var(--paper)',
                      color: orderStatusFilter === 'RETURNS' ? 'var(--paper)' : 'var(--ink)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      borderRadius: '9999px',
                      fontWeight: 500,
                    }}
                  >
                    İade Talebi Olanlar
                  </button>
                )}
              </div>

              {/* Search input with Apple squircle form */}
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex' }}>
                  <Icons.Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Sipariş no veya ürün adı ile ara..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 34px 9px 34px',
                    fontSize: '13px',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--paper)',
                    outline: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                />
                {orderSearch && (
                  <button
                    type="button"
                    onClick={() => setOrderSearch('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '15px',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {filteredOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {filteredOrders.map((order: any) => {
                  const returnReq = order.returns && order.returns.length > 0 ? order.returns[0] : null;
                  const trackingUrl = getCarrierTrackingUrl(order.trackingCompany, order.trackingCode);
                  const progressIdx = getOrderProgressIndex(order.status);
                  const isEligibleForReturn = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'].includes(order.status) && !returnReq;

                  return (
                    <article
                      key={order.id}
                      className="apple-card"
                      style={{
                        padding: 'clamp(20px, 3vw, 32px)',
                      }}
                    >
                      {/* Order Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--line)',
                        paddingBottom: '18px',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            SİPARİŞ NUMARASI
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '17px', letterSpacing: '0.02em', color: 'var(--ink)' }}>
                              {order.orderNumber}
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleCopy(order.orderNumber, order.orderNumber)}
                              title="Sipariş numarasını kopyala"
                              className="apple-press print-hide"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                color: copiedId === order.orderNumber ? '#166534' : 'var(--muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Icons.Copy size={11} color="currentColor" />
                              <span>{copiedId === order.orderNumber ? 'Kopyalandı' : 'Kopyala'}</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            SİPARİŞ TARİHİ
                          </span>
                          <span style={{ fontSize: '14px', color: 'var(--ink)' }}>
                            {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            DURUM
                          </span>
                          {getStatusBadge(order.status)}
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            TOPLAM BEDEL
                          </span>
                          <strong style={{ fontSize: '17px', color: 'var(--ink)' }}>
                            {money(order.totalAmount)}
                          </strong>
                        </div>
                      </div>

                      {/* Visual Order Stepper with Apple physics aesthetic */}
                      {progressIdx > 0 && (
                        <div style={{
                          background: 'var(--surface)',
                          borderRadius: '10px',
                          padding: '16px 20px',
                          marginBottom: '24px',
                        }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            position: 'relative',
                            textAlign: 'center',
                            gap: '8px',
                          }}>
                            {[
                              { label: 'Sipariş Alındı', step: 1 },
                              { label: 'Hazırlanıyor', step: 2 },
                              { label: 'Kargoya Verildi', step: 3 },
                              { label: 'Teslim Edildi', step: 4 },
                            ].map((s) => {
                              const isCompleted = progressIdx >= s.step;
                              const isCurrent = progressIdx === s.step;
                              return (
                                <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: isCompleted ? 'var(--ink)' : 'var(--line)',
                                    color: isCompleted ? 'var(--paper)' : 'var(--muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    marginBottom: '6px',
                                    border: isCurrent ? '2px solid var(--focus)' : 'none',
                                    transition: 'all 200ms ease',
                                  }}>
                                    {isCompleted ? <Icons.Check size={13} color="currentColor" /> : s.step}
                                  </div>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: isCurrent ? 600 : 400,
                                    color: isCompleted ? 'var(--ink)' : 'var(--muted)',
                                    letterSpacing: '0.02em',
                                  }}>
                                    {s.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Real Shipping & Carrier Tracking */}
                      {order.trackingCode && (
                        <div style={{
                          marginBottom: '20px',
                          padding: '14px 18px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <Icons.Truck size={18} color="#0f172a" />
                            <div>
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                                {order.trackingCompany || 'Kargo Firması'}
                              </strong>
                              <span style={{ fontSize: '13px', color: '#475569', marginLeft: '8px' }}>
                                Takip Kodu: <code style={{ fontWeight: 600, color: '#0f172a' }}>{order.trackingCode}</code>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(order.trackingCode, `track-${order.id}`)}
                              className="apple-press print-hide"
                              style={{
                                background: 'transparent',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                color: copiedId === `track-${order.id}` ? '#166534' : '#475569',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Icons.Copy size={11} color="currentColor" />
                              <span>{copiedId === `track-${order.id}` ? 'Kopyalandı' : 'Kopyala'}</span>
                            </button>
                          </div>

                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="apple-press print-hide"
                              style={{
                                background: '#1e293b',
                                color: '#ffffff',
                                padding: '7px 16px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: 500,
                                textDecoration: 'none',
                                letterSpacing: '0.03em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>Canlı Kargo Takibi</span>
                              <Icons.ArrowUpRight size={12} color="currentColor" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Items List */}
                      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 14px', fontWeight: 600 }}>
                          Sipariş Edilen Parçalar ({order.items?.length || 0})
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {order.items?.map((item: any) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto',
                                gap: '16px',
                                alignItems: 'center',
                                paddingBottom: '14px',
                                borderBottom: '1px solid rgba(0,0,0,0.04)',
                              }}
                            >
                              {/* Squircle Thumbnail */}
                              <div style={{ width: '56px', height: '72px', background: 'var(--surface)', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                                {item.product?.image ? (
                                  <Image
                                    src={item.product.image}
                                    alt={item.productName}
                                    fill
                                    sizes="56px"
                                    style={{ objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                                    <Icons.Package size={20} />
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div>
                                {item.product?.slug ? (
                                  <Link
                                    href={`/urun/${item.product.slug}`}
                                    className="apple-press"
                                    style={{
                                      fontFamily: 'var(--font-product, var(--sans))',
                                      fontSize: '17px',
                                      textDecoration: 'none',
                                      color: 'var(--ink)',
                                      letterSpacing: '0.03em',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      marginBottom: '4px',
                                    }}
                                  >
                                    <span>{item.productName}</span>
                                    <Icons.ArrowUpRight size={12} color="var(--muted)" />
                                  </Link>
                                ) : (
                                  <strong style={{
                                    fontFamily: 'var(--font-product, var(--sans))',
                                    fontSize: '17px',
                                    color: 'var(--ink)',
                                    display: 'block',
                                    marginBottom: '4px',
                                  }}>
                                    {item.productName}
                                  </strong>
                                )}
                                <div style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '12px' }}>
                                  <span>Beden: <strong style={{ color: 'var(--ink)' }}>{item.size}</strong></span>
                                  <span>Adet: <strong style={{ color: 'var(--ink)' }}>{item.quantity}</strong></span>
                                  <span>Birim: {money(item.price)}</span>
                                </div>
                              </div>

                              {/* Line Total */}
                              <div style={{ textAlign: 'right' }}>
                                <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>
                                  {money(item.price * item.quantity)}
                                </strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery & Financial Summary Breakdown */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '24px',
                        background: 'var(--surface)',
                        borderRadius: '10px',
                        padding: '18px 22px',
                        marginBottom: '20px',
                      }}>
                        {/* Delivery address details */}
                        <div>
                          <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                            TESLİMAT VE ALICI BİLGİSİ
                          </span>
                          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            {order.customerName} {order.customerPhone ? `· ${order.customerPhone}` : ''}
                          </p>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
                            {order.shippingAddress}
                            <br />
                            {order.shippingDistrict} / {order.shippingCity}
                          </p>
                          {order.shippingNotes && (
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                              Not: {order.shippingNotes}
                            </p>
                          )}
                        </div>

                        {/* Price Breakdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--muted)' }}>
                            <span>Ara Toplam:</span>
                            <span>{money(order.items?.reduce((s: number, i: any) => s + (i.price * i.quantity), 0) || order.totalAmount)}</span>
                          </div>

                          {order.discountAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#166534' }}>
                              <span>İndirim {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                              <span>-{money(order.discountAmount)}</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--muted)' }}>
                            <span>Kargo & Özel Paketleme:</span>
                            <span>Ücretsiz (Özel İkram)</span>
                          </div>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--ink)',
                            borderTop: '1px solid var(--line)',
                            paddingTop: '6px',
                            marginTop: '2px',
                          }}>
                            <span>Genel Toplam:</span>
                            <span>{money(order.totalAmount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions / Return Handling */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        borderTop: '1px solid var(--line)',
                        paddingTop: '16px',
                      }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="apple-press print-hide"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--line)',
                              borderRadius: '9999px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              color: 'var(--ink)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 500,
                            }}
                          >
                            <Icons.Printer size={13} color="currentColor" />
                            <span>Sipariş Makbuzu Yazdır</span>
                          </button>
                        </div>

                        <div>
                          {returnReq ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                              <span style={{ color: 'var(--muted)' }}>İade Durumu:</span>
                              {returnReq.status === 'BEKLIYOR' && (
                                <span className="apple-badge apple-badge-amber">
                                  ⏳ İnceleniyor ({new Date(returnReq.createdAt).toLocaleDateString('tr-TR')})
                                </span>
                              )}
                              {returnReq.status === 'ONAYLANDI' && (
                                <span className="apple-badge apple-badge-green">
                                  ✓ İade Onaylandı (Kargo Kodu ile Gönderin)
                                </span>
                              )}
                              {returnReq.status === 'REDDEDILDI' && (
                                <span className="apple-badge apple-badge-red" title={returnReq.adminNotes || ''}>
                                  ✗ İade Reddedildi ({returnReq.adminNotes || 'Hijyen koşulları'})
                                </span>
                              )}
                            </div>
                          ) : isEligibleForReturn ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReturnModalOrder(order);
                                setReturnReason('');
                                setReturnError(null);
                                setReturnSuccess(null);
                              }}
                              className="apple-press print-hide"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--line)',
                                borderRadius: '9999px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                color: 'var(--ink)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 500,
                              }}
                            >
                              <Icons.RotateCcw size={13} color="currentColor" />
                              <span>İade Talebi Oluştur</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                              İade süresi veya sipariş durumu uygun değil
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="apple-card" style={{
                padding: '60px 24px',
                textAlign: 'center',
              }}>
                <p style={{ font: '400 24px var(--serif)', margin: '0 0 10px', color: 'var(--ink)' }}>
                  {orderSearch || orderStatusFilter !== 'ALL'
                    ? 'Aramanıza uygun sipariş bulunamadı.'
                    : 'Henüz verilmiş bir siparişiniz bulunmuyor.'}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 24px', maxWidth: '420px', marginInline: 'auto' }}>
                  {orderSearch || orderStatusFilter !== 'ALL'
                    ? 'Filtreleri sıfırlayarak tüm siparişlerinizi tekrar görüntüleyebilirsiniz.'
                    : 'Pandiones zamansız ipek ve ev giyim koleksiyonlarını keşfederek ilk siparişinizi oluşturabilirsiniz.'}
                </p>

                {orderSearch || orderStatusFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearch('');
                      setOrderStatusFilter('ALL');
                    }}
                    className="apple-press"
                    style={{
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '12px 24px',
                      fontSize: '12px',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                    }}
                  >
                    Filtreleri Temizle
                  </button>
                ) : (
                  <Link
                    href="/koleksiyon"
                    className="apple-press"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      padding: '12px 28px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      letterSpacing: '0.06em',
                      textDecoration: 'none',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                    }}
                  >
                    <span>Koleksiyonu Keşfet</span>
                    <Icons.ArrowUpRight size={13} color="currentColor" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FAVORILERIM */}
        {activeTab === 'favoriler' && (
          <div role="tabpanel" aria-label="Favorilerim">
            {user.wishlists && user.wishlists.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
                    Kayıtlı <strong style={{ color: 'var(--ink)' }}>{user.wishlists.length}</strong> parça listenizde bulunuyor.
                  </p>
                  <Link
                    href="/favorilerim"
                    className="apple-press"
                    style={{ fontSize: '13px', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>Tümünü Favoriler Sayfasında Aç</span>
                    <Icons.ArrowUpRight size={13} color="currentColor" />
                  </Link>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '20px',
                }}>
                  {user.wishlists.map((w: any) => {
                    const prod = w.product;
                    if (!prod) return null;
                    const inStock = prod.variants?.some((v: any) => v.stock > 0);
                    const availableSizes = prod.variants?.filter((v: any) => v.stock > 0).map((v: any) => v.size) || [];

                    return (
                      <div
                        key={w.id || prod.id}
                        className="apple-card"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Image */}
                        <div style={{ position: 'relative', aspectRatio: '2/3', background: 'var(--surface)' }}>
                          {prod.image ? (
                            <Image
                              src={prod.image}
                              alt={prod.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                              Görsel Yok
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveWishlist(prod.id)}
                            title="Favorilerden Çıkar"
                            className="apple-press"
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'rgba(255,255,255,0.92)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(0,0,0,0.08)',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '16px',
                              color: 'var(--ink)',
                            }}
                          >
                            ×
                          </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                            {prod.category === 'ic-giyim' ? 'İç Giyim' : 'Ev Giyim'}
                          </span>

                          <h3 style={{
                            fontFamily: 'var(--font-product, var(--sans))',
                            fontSize: '18px',
                            margin: '0 0 6px',
                            letterSpacing: '0.03em',
                            color: 'var(--ink)',
                          }}>
                            {prod.name}
                          </h3>

                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                            {money(prod.price)}
                          </div>

                          <div style={{ fontSize: '12px', color: inStock ? '#166534' : '#991b1b', marginBottom: '14px' }}>
                            {inStock ? `Stokta (Bedenler: ${availableSizes.join(', ')})` : 'Tükendi'}
                          </div>

                          <div style={{ marginTop: 'auto' }}>
                            <Link
                              href={`/urun/${prod.slug}`}
                              className="apple-press"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: 'var(--ink)',
                                color: 'var(--paper)',
                                padding: '10px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                letterSpacing: '0.06em',
                                textDecoration: 'none',
                                textTransform: 'uppercase',
                                fontWeight: 500,
                              }}
                            >
                              <span>Parçayı İncele</span>
                              <Icons.ArrowUpRight size={12} color="currentColor" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="apple-card" style={{
                padding: '60px 24px',
                textAlign: 'center',
              }}>
                <p style={{ font: '400 24px var(--serif)', margin: '0 0 10px', color: 'var(--ink)' }}>
                  Favori listeniz henüz boş.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 24px', maxWidth: '420px', marginInline: 'auto' }}>
                  Beğendiğiniz ipek ve ev giyim tasarımlarını kalp ikonuna tıklayarak hesabınıza kaydedebilir, stok ve güncellemelerini buradan takip edebilirsiniz.
                </p>
                <Link
                  href="/koleksiyon"
                  className="apple-press"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    padding: '12px 28px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    letterSpacing: '0.06em',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                  }}
                >
                  <span>Koleksiyonu Keşfet</span>
                  <Icons.ArrowUpRight size={13} color="currentColor" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IADE TALEPLERIM */}
        {activeTab === 'iadeler' && (
          <div role="tabpanel" aria-label="İade Taleplerim">
            {/* Hygiene legal banner */}
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '16px 20px',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#991b1b',
              marginBottom: '28px',
            }}>
              <strong>⚠️ 6502 Sayılı Kanun ve Hijyen Güvencesi:</strong>
              <br />
              Mevzuat ve hijyen ilkelerimiz gereğince; koruyucu hijyen bandı açılmış, denenmiş veya ambalaj bütünlüğü bozulmuş alt iç giyim ve hassas parçaların iadesi kabul edilememektedir. Onaylanan iadeler anlaşmalı kargo kodu ile tarafımıza ücretsiz ulaştırılır.
            </div>

            {allUserReturns.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {allUserReturns.map((ret: any) => (
                  <div
                    key={ret.id}
                    className="apple-card"
                    style={{
                      padding: '24px 28px',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      borderBottom: '1px solid var(--line)',
                      paddingBottom: '14px',
                      marginBottom: '16px',
                    }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block' }}>
                          İLGİLİ SİPARİŞ
                        </span>
                        <strong style={{ fontSize: '15px' }}>{ret.orderNumber}</strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block' }}>
                          TALEP TARİHİ
                        </span>
                        <span style={{ fontSize: '13px' }}>
                          {new Date(ret.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                          DURUM
                        </span>
                        {ret.status === 'BEKLIYOR' && (
                          <span className="apple-badge apple-badge-amber">
                            ⏳ İnceleniyor
                          </span>
                        )}
                        {ret.status === 'ONAYLANDI' && (
                          <span className="apple-badge apple-badge-green">
                            ✓ Onaylandı
                          </span>
                        )}
                        {ret.status === 'REDDEDILDI' && (
                          <span className="apple-badge apple-badge-red">
                            ✗ Reddedildi
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                        İletilen Gerekçe:
                      </span>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', background: 'var(--surface)', padding: '12px 14px', borderRadius: '8px' }}>
                        {ret.reason}
                      </p>
                    </div>

                    {ret.adminNotes && (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#1e3a8a' }}>
                        <strong>Müşteri Hizmetleri Notu:</strong> {ret.adminNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="apple-card" style={{
                padding: '50px 24px',
                textAlign: 'center',
              }}>
                <p style={{ font: '400 22px var(--serif)', margin: '0 0 8px', color: 'var(--ink)' }}>
                  Kayıtlı bir iade talebiniz bulunmuyor.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
                  Teslim aldığınız siparişleriniz için &quot;Siparişlerim&quot; sekmesinden hijyen koşullarına uygun olarak iade talebi oluşturabilirsiniz.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROFIL VE GUVENLIK */}
        {activeTab === 'profil' && (
          <div role="tabpanel" aria-label="Profil ve Güvenlik">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '28px',
            }}>
              {/* Profile Details Form */}
              <div className="apple-card" style={{
                padding: 'clamp(24px, 3vw, 36px)',
              }}>
                <h2 style={{ font: '400 24px var(--serif)', margin: '0 0 6px', color: 'var(--ink)' }}>
                  Kişisel Bilgiler
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 24px' }}>
                  Teslimat ve sipariş bildirimlerinizde kullanılacak ad ve iletişim bilgilerinizi güncelleyin.
                </p>

                {profileSuccess && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', padding: '12px 16px', fontSize: '13px', marginBottom: '20px' }}>
                    {profileSuccess}
                  </div>
                )}

                {profileError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', padding: '12px 16px', fontSize: '13px', marginBottom: '20px' }}>
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile}>
                  <div style={{ marginBottom: '18px' }}>
                    <label htmlFor="profile-name" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Ad Soyad *
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '14px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        background: 'var(--paper)',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label htmlFor="profile-email" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      E-Posta Adresi
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="profile-email"
                        type="email"
                        disabled
                        value={user.email}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '14px',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          background: 'var(--surface)',
                          color: 'var(--muted)',
                          cursor: 'not-allowed',
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontWeight: 600,
                      }}>
                        Doğrulanmış
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                      Güvenliğiniz için kayıtlı e-posta adresi doğrudan değiştirilemez.
                    </span>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label htmlFor="profile-phone" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Telefon Numarası
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '14px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        background: 'var(--paper)',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                      Kargo teslimat bildirimleri için kullanılır.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingProfile}
                    className="apple-press"
                    style={{
                      width: '100%',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '13px',
                      fontSize: '12px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      cursor: submittingProfile ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingProfile ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </form>
              </div>

              {/* Password Change Form */}
              <div className="apple-card" style={{
                padding: 'clamp(24px, 3vw, 36px)',
              }}>
                <h2 style={{ font: '400 24px var(--serif)', margin: '0 0 6px', color: 'var(--ink)' }}>
                  Şifre Değiştir
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 24px' }}>
                  Hesabınızın güvenliğini korumak için güçlü ve benzersiz bir şifre belirleyin.
                </p>

                {passwordSuccess && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', padding: '12px 16px', fontSize: '13px', marginBottom: '20px' }}>
                    {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', padding: '12px 16px', fontSize: '13px', marginBottom: '20px' }}>
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword}>
                  <div style={{ marginBottom: '18px' }}>
                    <label htmlFor="current-pass" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Mevcut Şifre *
                    </label>
                    <input
                      id="current-pass"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '14px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        background: 'var(--paper)',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label htmlFor="new-pass" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Yeni Şifre (En az 6 karakter) *
                    </label>
                    <input
                      id="new-pass"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '14px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        background: 'var(--paper)',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="confirm-pass" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Yeni Şifre Tekrar *
                    </label>
                    <input
                      id="confirm-pass"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '14px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        background: 'var(--paper)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <input
                      type="checkbox"
                      id="show-passwords-chk"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="show-passwords-chk" style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>
                      Şifreleri görünür yap
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPassword}
                    className="apple-press"
                    style={{
                      width: '100%',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '13px',
                      fontSize: '12px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      cursor: submittingPassword ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingPassword ? 'Şifre Güncelleniyor...' : 'Şifremi Güncelle'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: KAYITLI ADRESLER */}
        {activeTab === 'adresler' && (
          <div role="tabpanel" aria-label="Kayıtlı Adresler">
            {/* Header bar with New Address button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '28px',
            }}>
              <div>
                <h2 style={{ font: '400 26px var(--serif)', margin: '0 0 6px', color: 'var(--ink)' }}>
                  Kayıtlı Teslimat Adresleri
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, maxWidth: '580px', lineHeight: 1.5 }}>
                  Siparişlerinizde hızlı teslimat için adreslerinizi yönetebilir, Google Haritalar ile tek tıkla canlı navigasyon veya harita konumu başlatabilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewAddress}
                className="apple-press"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '11px 22px',
                  fontSize: '12px',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                <Icons.Plus size={14} color="currentColor" />
                <span>Yeni Adres Ekle</span>
              </button>
            </div>

            {loadingAddresses ? (
              <div className="apple-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--ink)', borderRadius: '50%', margin: '0 auto 12px', animation: 'appleSpin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Adresler yükleniyor...</p>
              </div>
            ) : dbAddresses.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
                marginBottom: '36px',
              }}>
                {dbAddresses.map((addr: any) => {
                  const fullText = `${addr.title} - ${addr.recipient} (${addr.phone})\n${addr.address}\n${addr.district} / ${addr.city}${addr.postalCode ? ` - ${addr.postalCode}` : ''}`;
                  const titleMeta = ADDRESS_TITLES.find((t) => t.key === addr.title) || { icon: '📍', label: addr.title };

                  return (
                    <div
                      key={addr.id}
                      className="apple-card"
                      style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: addr.isDefault ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                        position: 'relative',
                        background: 'var(--paper)',
                      }}
                    >
                      <div>
                        {/* Card header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            background: 'var(--surface)',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            color: 'var(--ink)',
                          }}>
                            <span>{titleMeta.icon}</span>
                            <span>{addr.title || 'Teslimat Adresi'}</span>
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {addr.isDefault && (
                              <span className="apple-badge apple-badge-green" style={{ fontSize: '10px' }}>
                                <span className="apple-badge-dot" /> Varsayılan
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditAddress(addr)}
                              className="apple-press"
                              title="Adresi Düzenle"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--muted)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '4px 6px',
                              }}
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="apple-press"
                              title="Adresi Sil"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Icons.Trash size={14} color="#dc2626" />
                            </button>
                          </div>
                        </div>

                        {/* Recipient & Phone */}
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--ink)' }}>
                          {addr.recipient}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px' }}>
                          {addr.phone}
                        </p>

                        {/* Full address line */}
                        <p style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 4px' }}>
                          {addr.address}
                        </p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                          {addr.district} / {addr.city} {addr.postalCode ? `(${addr.postalCode})` : ''}
                        </p>
                      </div>

                      {/* Google Navigation & Card Actions */}
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Direct Turn-by-Turn Google Maps Navigation */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <a
                            href={getGoogleNavUrl(addr.address, addr.district, addr.city)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apple-press"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              textDecoration: 'none',
                            }}
                          >
                            <Icons.Navigation size={13} color="#2563eb" />
                            <span>Navigasyon ↗</span>
                          </a>

                          <a
                            href={getGoogleMapUrl(addr.address, addr.district, addr.city)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apple-press"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              textDecoration: 'none',
                            }}
                          >
                            <Icons.Compass size={13} color="#059669" />
                            <span>Haritada Aç ↗</span>
                          </a>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleCopy(fullText, `db-addr-${addr.id}`)}
                            className="apple-press"
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: '1px solid var(--line)',
                              borderRadius: '8px',
                              padding: '7px 10px',
                              fontSize: '11px',
                              color: copiedId === `db-addr-${addr.id}` ? '#166534' : 'var(--ink)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontWeight: 500,
                            }}
                          >
                            <Icons.Copy size={12} color="currentColor" />
                            <span>{copiedId === `db-addr-${addr.id}` ? 'Kopyalandı' : 'Kopyala'}</span>
                          </button>

                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="apple-press"
                              style={{
                                flex: 1,
                                background: 'transparent',
                                border: '1px solid var(--line)',
                                borderRadius: '8px',
                                padding: '7px 10px',
                                fontSize: '11px',
                                color: 'var(--muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                fontWeight: 500,
                              }}
                            >
                              <Icons.Star size={12} color="var(--muted)" />
                              <span>Varsayılan Yap</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="apple-card" style={{
                padding: '50px 24px',
                textAlign: 'center',
                marginBottom: '36px',
              }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Icons.MapPin size={24} color="var(--muted)" />
                </div>
                <p style={{ font: '400 22px var(--serif)', margin: '0 0 8px', color: 'var(--ink)' }}>
                  Henüz kayıtlı bir adresiniz bulunmuyor.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 24px', maxWidth: '420px', marginInline: 'auto' }}>
                  Yeni bir teslimat adresi ekleyerek sipariş adımlarını tek tıkla tamamlayabilir ve Google Haritalar üzerinden doğrudan yol tarifi alabilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewAddress}
                  className="apple-press"
                  style={{
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '12px 24px',
                    fontSize: '12px',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 500,
                  }}
                >
                  <Icons.Plus size={14} color="currentColor" />
                  <span>İlk Adresinizi Ekleyin</span>
                </button>
              </div>
            )}

            {/* Past orders delivery addresses history fallback */}
            {savedAddresses.length > 0 && (
              <div style={{ marginTop: '28px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '14px', letterSpacing: '0.04em', color: 'var(--ink)', marginBottom: '14px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Geçmiş Siparişlerde Kullanılan Adresler ({savedAddresses.length})
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}>
                  {savedAddresses.map((addr: any, idx: number) => {
                    const fullText = `${addr.recipient} - ${addr.phone}\n${addr.address}\n${addr.district} / ${addr.city}`;
                    return (
                      <div
                        key={idx}
                        className="apple-card"
                        style={{
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          background: 'rgba(0,0,0,0.015)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                              Sipariş Adresi {idx + 1}
                            </span>
                            <span style={{ fontSize: '10px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '9999px', color: 'var(--muted)' }}>
                              {new Date(addr.lastUsed).toLocaleDateString('tr-TR')}
                            </span>
                          </div>

                          <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px', color: 'var(--ink)' }}>
                            {addr.recipient}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 6px' }}>
                            {addr.phone}
                          </p>
                          <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.4, margin: 0 }}>
                            {addr.address} <br />
                            <strong>{addr.district} / {addr.city}</strong>
                          </p>
                        </div>

                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleCopy(fullText, `ord-addr-${idx}`)}
                            className="apple-press"
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: '1px solid var(--line)',
                              borderRadius: '6px',
                              padding: '6px',
                              fontSize: '11px',
                              color: copiedId === `ord-addr-${idx}` ? '#166534' : 'var(--ink)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <Icons.Copy size={11} color="currentColor" />
                            <span>{copiedId === `ord-addr-${idx}` ? 'Kopyalandı' : 'Kopyala'}</span>
                          </button>

                          <a
                            href={getGoogleNavUrl(addr.address, addr.district, addr.city)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apple-press"
                            style={{
                              flex: 1,
                              background: 'var(--surface)',
                              border: '1px solid var(--line)',
                              borderRadius: '6px',
                              padding: '6px',
                              fontSize: '11px',
                              color: 'var(--ink)',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontWeight: 500,
                            }}
                          >
                            <Icons.Navigation size={11} color="#2563eb" />
                            <span>Harita ↗</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ILETISIM TERCIHLERI */}
        {activeTab === 'tercihler' && (
          <div role="tabpanel" aria-label="İletişim Tercihleri">
            <div className="apple-card" style={{
              padding: 'clamp(24px, 3.5vw, 40px)',
              maxWidth: '720px',
            }}>
              <h2 style={{ font: '400 26px var(--serif)', margin: '0 0 8px', color: 'var(--ink)' }}>
                Pandiones Özel Seçki & E-Bülten Tercihleri
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 28px' }}>
                Sınırlı sayıda üretilen kapsül koleksiyonlar, sezonluk özel davetler ve sadece üyelere sunulan öncelikli erişim haklarından haberdar olun.
              </p>

              {newsletterMessage && (
                <div style={{
                  background: isSubscribed ? '#f0fdf4' : '#eff6ff',
                  border: `1px solid ${isSubscribed ? '#bbf7d0' : '#bfdbfe'}`,
                  borderRadius: '8px',
                  color: isSubscribed ? '#166534' : '#1e3a8a',
                  padding: '14px 18px',
                  fontSize: '13px',
                  marginBottom: '24px',
                }}>
                  {newsletterMessage}
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                background: 'var(--surface)',
                borderRadius: '10px',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '16px',
              }}>
                <div>
                  <strong style={{ fontSize: '15px', color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    E-Bülten Aboneliği ({user.email})
                  </strong>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {isSubscribed ? 'Şu anda bülten listemize kayıtlısınız.' : 'Şu anda bülten listemizde kayıtlı değilsiniz.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleNewsletter}
                  disabled={togglingNewsletter}
                  className="apple-press"
                  style={{
                    background: isSubscribed ? 'transparent' : 'var(--ink)',
                    color: isSubscribed ? '#991b1b' : 'var(--paper)',
                    border: isSubscribed ? '1px solid #fecaca' : 'none',
                    borderRadius: '9999px',
                    padding: '10px 22px',
                    fontSize: '12px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: togglingNewsletter ? 'not-allowed' : 'pointer',
                  }}
                >
                  {togglingNewsletter ? 'İşleniyor...' : isSubscribed ? 'Aboneliği Sonlandır' : 'Bültene Abone Ol'}
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                <strong>Gizlilik ve KVKK Güvencesi:</strong> E-posta adresiniz hiçbir koşulda üçüncü taraflarla paylaşılmaz. Pandiones yalnızca yeni koleksiyon lansmanları ve sipariş bildirimleri amacıyla iletişim kurar. Dilediğiniz zaman tek tıkla ayrılabilirsiniz.
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Return Request Modal with Spring Animation & Accessible Blur Overlay */}
      {returnModalOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-modal-title"
          className="modal-overlay"
          onClick={() => setReturnModalOrder(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
            animation: 'fadeInQuick 150ms ease-out',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              width: '100%',
              maxWidth: '560px',
              borderRadius: '14px',
              padding: 'clamp(24px, 4vw, 36px)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.16)',
              animation: 'modalSpringIn 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 id="return-modal-title" style={{ font: '400 24px var(--serif)', margin: 0, color: 'var(--ink)' }}>
                İade Talebi Oluştur
              </h3>
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                aria-label="Kapat"
                className="apple-press"
                style={{
                  background: 'var(--surface)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Sipariş No: <strong>{returnModalOrder.orderNumber}</strong> ({new Date(returnModalOrder.createdAt).toLocaleDateString('tr-TR')})
            </p>

            {/* Hygiene legal notice */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', lineHeight: 1.6, color: '#991b1b', marginBottom: '18px' }}>
              <strong>⚠️ Hijyen ve Mevzuat Hatırlatması:</strong>
              <br />
              6502 Sayılı Tüketicinin Korunması Kanunu gereği; koruyucu hijyen bandı çıkarılmış, denenmiş veya ambalajı zarar görmüş iç giyim parçalarının iadesi kabul edilememektedir. Parçanın denenmemiş ve orijinal kutusunda olması gerekmektedir.
            </div>

            {returnError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                {returnError}
              </div>
            )}

            {returnSuccess ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', color: '#166534', fontSize: '13px', textAlign: 'center' }}>
                {returnSuccess}
              </div>
            ) : (
              <form onSubmit={handleCreateReturn}>
                <div style={{ marginBottom: '18px' }}>
                  <label htmlFor="return-reason-text" style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    İade Nedeni ve Açıklamanız *
                  </label>
                  <textarea
                    id="return-reason-text"
                    required
                    rows={4}
                    placeholder="Örn: Beden uymadı, ürün orijinal kutusunda ve koruma bandı açılmamıştır..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '13px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: 'var(--paper)',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setReturnModalOrder(null)}
                    className="apple-press"
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      letterSpacing: '0.03em',
                      cursor: 'pointer',
                    }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReturn}
                    className="apple-press"
                    style={{
                      padding: '10px 24px',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      border: 'none',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      cursor: submittingReturn ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingReturn ? 'İletiliyor...' : 'İade Talebini Gönder ↗'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Address Create / Edit Modal with Google Maps Autocomplete */}
      {addressModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
          className="modal-overlay"
          onClick={() => setAddressModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
            animation: 'fadeInQuick 150ms ease-out',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              width: '100%',
              maxWidth: '580px',
              borderRadius: '16px',
              padding: 'clamp(24px, 4vw, 36px)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.18)',
              animation: 'modalSpringIn 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  TESLİMAT NOKTASI
                </span>
                <h3 id="address-modal-title" style={{ font: '400 24px var(--serif)', margin: 0, color: 'var(--ink)' }}>
                  {editingAddressId ? 'Adresi Düzenle' : 'Yeni Teslimat Adresi Ekle'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                aria-label="Kapat"
                className="apple-press"
                style={{
                  background: 'var(--surface)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                ×
              </button>
            </div>

            {/* Address Title Pill Selector */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Adres Başlığı *
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ADDRESS_TITLES.map((t) => {
                  const isActive = addrTitle === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAddrTitle(t.key)}
                      className="apple-press"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        border: isActive ? '1px solid var(--ink)' : '1px solid var(--line)',
                        background: isActive ? 'var(--ink)' : 'var(--surface)',
                        color: isActive ? 'var(--paper)' : 'var(--ink)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 160ms ease',
                      }}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Google Haritalar Smart Autocomplete Section matching User Screenshot */}
            <div style={{ marginBottom: '22px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="google-address-search" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af' }}>
                  <span>📍</span> Google Haritalar ile Hızlı Konum Bul
                </label>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Örn: Keçeyolu, Nişantaşı</span>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="google-address-search"
                  type="text"
                  placeholder="Sokak, cadde, mahalle veya ilçe yazın (örn: keç)..."
                  value={googleQuery}
                  onChange={(e) => {
                    setGoogleQuery(e.target.value);
                    setShowGoogleDropdown(true);
                  }}
                  onFocus={() => setShowGoogleDropdown(true)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    fontSize: '13px',
                    border: '1.5px solid #3b82f6',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.08)',
                  }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', display: 'flex' }}>
                  <Icons.Search size={16} color="#3b82f6" />
                </span>
                {googleQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleQuery('');
                      setShowGoogleDropdown(false);
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {showGoogleDropdown && filteredGooglePlaces.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                    zIndex: 20,
                    overflow: 'hidden',
                  }}
                >
                  {filteredGooglePlaces.map((place, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectGooglePlace(place)}
                      className="apple-press"
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < filteredGooglePlaces.length - 1 ? '1px solid #f1f5f9' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        background: '#ffffff',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#2563eb',
                      }}>
                        📍
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {place.subtitle}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>Seç ↗</span>
                    </div>
                  ))}

                  {/* Powered by Google badge matching the user screenshot */}
                  <div style={{
                    padding: '8px 16px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#64748b',
                  }}>
                    <span>powered by</span>
                    <strong style={{ color: '#475569', letterSpacing: '-0.02em' }}>Google</strong>
                  </div>
                </div>
              )}
            </div>

            {addressError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
                {addressError}
              </div>
            )}

            {addressSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', padding: '12px 16px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                ✓ {addressSuccess}
              </div>
            )}

            <form onSubmit={handleSaveAddress}>
              {/* Recipient & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label htmlFor="addr-recipient" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Teslim Alacak Kişi (Ad Soyad) *
                  </label>
                  <input
                    id="addr-recipient"
                    type="text"
                    required
                    placeholder="Örn: Aslı Yılmaz"
                    value={addrRecipient}
                    onChange={(e) => setAddrRecipient(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '13px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: 'var(--paper)',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="addr-phone" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Telefon Numarası *
                  </label>
                  <input
                    id="addr-phone"
                    type="tel"
                    required
                    placeholder="05XX XXX XX XX"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '13px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: 'var(--paper)',
                    }}
                  />
                </div>
              </div>

              {/* City & District */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label htmlFor="addr-city" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    İl (Şehir) *
                  </label>
                  <input
                    id="addr-city"
                    type="text"
                    required
                    placeholder="İstanbul"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '13px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: 'var(--paper)',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="addr-district" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    İlçe *
                  </label>
                  <input
                    id="addr-district"
                    type="text"
                    required
                    placeholder="Nişantaşı / Beşiktaş"
                    value={addrDistrict}
                    onChange={(e) => setAddrDistrict(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '13px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: 'var(--paper)',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="addr-postal-code" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Posta Kodu
                  </label>
                  <input
                    id="addr-postal-code"
                    type="text"
                    placeholder="34365"
                    value={addrPostalCode}
                    onChange={(e) => setAddrPostalCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '13px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: 'var(--paper)',
                    }}
                  />
                </div>
              </div>

              {/* Address details */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="addr-full-address" style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Açık Adres (Cadde, Mahalle, Sokak, Bina No, Daire) *
                </label>
                <textarea
                  id="addr-full-address"
                  required
                  rows={3}
                  placeholder="Kuryenin adresi kolay bulması için detaylı yazınız..."
                  value={addrAddress}
                  onChange={(e) => setAddrAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '13px',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--paper)',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Default address checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <input
                  type="checkbox"
                  id="addr-is-default-chk"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="addr-is-default-chk" style={{ fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                  Bu adresi varsayılan teslimat adresim olarak kaydet
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="apple-press"
                  style={{
                    padding: '11px 22px',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    letterSpacing: '0.03em',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submittingAddress}
                  className="apple-press"
                  style={{
                    padding: '11px 26px',
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    border: 'none',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: submittingAddress ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingAddress ? 'Kaydediliyor...' : editingAddressId ? 'Adresi Güncelle ↗' : 'Adresi Kaydet ↗'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
