"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Product } from "@/lib/stripe";

export type { Product };
export type CartItem = Product & { quantity: number };

type CartContextType = {
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addedFlashKey: string | null;
  checkoutLoading: boolean;
  setCheckoutLoading: (v: boolean) => void;
  addToCart: (item: Product, source: "card" | "modal") => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [addedFlashKey, setAddedFlashKey] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sj_cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCartItems(parsed);
      }
    } catch {}
    setCartLoaded(true);
  }, []);

  // Persist to localStorage whenever cart changes (after initial load)
  useEffect(() => {
    if (!cartLoaded) return;
    localStorage.setItem("sj_cart", JSON.stringify(cartItems));
  }, [cartItems, cartLoaded]);

  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const cartSubtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const addToCart = useCallback((item: Product, source: "card" | "modal") => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setAddedFlashKey(`${source}:${item.id}`);
    window.setTimeout(() => setAddedFlashKey(null), 1200);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  return (
    <CartContext.Provider
      value={{
        cartItems, cartCount, cartSubtotal,
        addedFlashKey, checkoutLoading, setCheckoutLoading,
        addToCart, removeFromCart, updateQty, clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
