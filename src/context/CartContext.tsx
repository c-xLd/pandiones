'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CartItem } from '@/types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size: string, quantity?: number, meta?: Partial<CartItem>) => void;
  removeFromCart: (slug: string, size: string) => void;
  updateQuantity: (slug: string, size: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  
  // Modals state
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isBagOpen: boolean;
  setIsBagOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  activeGuide: 'size' | 'fabric' | 'privacy' | 'terms' | null;
  setActiveGuide: (guide: 'size' | 'fabric' | 'privacy' | 'terms' | null) => void;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [activeGuide, setActiveGuide] = useState<'size' | 'fabric' | 'privacy' | 'terms' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pandiones_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage (only after initial load to avoid wiping existing storage)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('pandiones_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, isLoaded]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const addToCart = (product: Product, size: string, quantity = 1, meta?: Partial<CartItem>) => {
    setCart((prev) => {
      const existing = !meta?.recipientEmail && prev.find((i) => i.slug === product.slug && i.size === size);
      if (existing) {
        return prev.map((i) =>
          i.slug === product.slug && i.size === size
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          color: product.color,
          image: product.image,
          size,
          quantity,
          ...meta,
        },
      ];
    });
    showToast(`${product.name} çantana eklendi.`);
  };

  const removeFromCart = (slug: string, size: string) => {
    setCart((prev) => prev.filter((i) => !(i.slug === slug && i.size === size)));
  };

  const updateQuantity = (slug: string, size: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.slug === slug && i.size === size) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        isMenuOpen,
        setIsMenuOpen,
        isBagOpen,
        setIsBagOpen,
        isSearchOpen,
        setIsSearchOpen,
        quickViewProduct,
        setQuickViewProduct,
        activeGuide,
        setActiveGuide,
        toastMessage,
        showToast,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
