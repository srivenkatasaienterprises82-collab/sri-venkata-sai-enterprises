"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  variantKey: string;
  ram: string;
  storage: string;
  price: number;
  quantity: number;
  colorName: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; variantKey: string }
  | { type: "UPDATE_QTY"; variantKey: string; qty: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

const CART_KEY = "svse_cart";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find(
        (i) => i.variantKey === action.item.variantKey
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantKey === action.item.variantKey
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, action.item] };
    }
    case "REMOVE":
      return {
        items: state.items.filter((i) => i.variantKey !== action.variantKey),
      };
    case "UPDATE_QTY":
      if (action.qty <= 0) {
        return {
          items: state.items.filter(
            (i) => i.variantKey !== action.variantKey
          ),
        };
      }
      return {
        items: state.items.map((i) =>
          i.variantKey === action.variantKey ? { ...i, quantity: action.qty } : i
        ),
      };
    case "CLEAR":
      return { items: [] };
    case "HYDRATE":
      return { items: action.items };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (variantKey: string) => void;
  updateQty: (variantKey: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartItem[];
      const migrated = parsed.map((item) =>
        item && typeof item === "object" && "colorName" in item
          ? item
          : { ...(item as Record<string, unknown>), colorName: "" }
      );
      dispatch({ type: "HYDRATE", items: migrated as CartItem[] });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CartContext] Failed to hydrate cart from localStorage:", error);
    }
  } finally {
    setHydrated(true);
  }
}, []);

useEffect(() => {
  if (!hydrated) return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.items));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CartContext] Failed to persist cart to localStorage:", error);
    }
  }
}, [hydrated, state.items]);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addToCart: (item) =>
          dispatch({
            type: "ADD",
            item: { ...item, quantity: item.quantity ?? 1 },
          }),
        removeFromCart: (variantKey) =>
          dispatch({ type: "REMOVE", variantKey }),
        updateQty: (variantKey, qty) =>
          dispatch({ type: "UPDATE_QTY", variantKey, qty }),
        clearCart: () => dispatch({ type: "CLEAR" }),
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside a <CartProvider>");
  }
  return ctx;
}
