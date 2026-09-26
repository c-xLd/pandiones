'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistItems: Product[];
  toggleWishlist: (product: Product) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  wishlistCount: number;
  isLoaded: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage for guest on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pandiones_wishlist_items');
      if (saved) {
        const items = JSON.parse(saved);
        setWishlistItems(items);
        setWishlistIds(items.map((i: Product) => i.id));
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Fetch from server if logged in
  useEffect(() => {
    if (user) {
      fetch('/api/wishlist')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.items)) {
            setWishlistItems(data.items);
            setWishlistIds(data.items.map((i: Product) => i.id));
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoaded(true);
        });
    }
  }, [user]);

  const toggleWishlist = async (product: Product) => {
    const isFav = wishlistIds.includes(product.id);

    let nextItems: Product[];
    if (isFav) {
      nextItems = wishlistItems.filter((i) => i.id !== product.id);
    } else {
      nextItems = [...wishlistItems, product];
    }

    setWishlistItems(nextItems);
    setWishlistIds(nextItems.map((i) => i.id));

    // Save to localStorage
    try {
      localStorage.setItem('pandiones_wishlist_items', JSON.stringify(nextItems));
    } catch {
      // ignore
    }

    // If logged in, inform backend
    if (user) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        });
      } catch {
        // ignore
      }
    }
  };

  const isFavorite = (productId: string) => wishlistIds.includes(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistItems,
        toggleWishlist,
        isFavorite,
        wishlistCount: wishlistIds.length,
        isLoaded,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
