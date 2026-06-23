"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  MessageCircle,
  User,
  Phone,
  MapPin,
  Building2,
  FileText,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { getAllProducts, formatPrice } from "@/lib/data/products";

interface FormFields {
  customerName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  pincode: string;
  notes: string;
}

const initialForm: FormFields = {
  customerName: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  pincode: "",
  notes: "",
};

const inputClass =
  "w-full rounded-[12px] border border-border-dim bg-card px-4 py-3 text-[14px] text-foreground placeholder:text-foreground-subtle outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

export default function CartPage() {
  const { items, updateQty, removeFromCart, clearCart, totalItems, totalPrice } =
    useCart();
  const [form, setForm] = useState<FormFields>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const allProducts = getAllProducts();

  const updateField = useCallback(
    (field: keyof FormFields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value })),
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim() || !form.city.trim() || !form.address.trim() || !form.pincode.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

  const cartItems = items.map((ci) => {
    const product = allProducts.find((p) => p.slug === ci.productId);
    const selectedColor = ci.colorName || product?.colors?.[0]?.name || "";
    return {
      productName: product?.name ?? ci.productId,
      productSlug: ci.productId,
      selectedStorage: `${ci.ram}, ${ci.storage}`,
      selectedColor,
      quantity: ci.quantity,
      price: ci.price,
      lineTotal: ci.price * ci.quantity,
    };
  });

    setSubmitting(true);

    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartItems,
        cartTotal: totalPrice,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        city: form.city.trim(),
        address: form.address.trim(),
        pincode: form.pincode.trim(),
        notes: form.notes.trim() || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to submit order");
        clearCart();
        toast.success("Order submitted! Redirecting to WhatsApp...");
        setTimeout(() => {
          window.location.href = data.whatsappUrl;
        }, 800);
      })
      .catch((err) => {
        toast.error(err.message || "Something went wrong. Please try again.");
      })
      .finally(() => setSubmitting(false));
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen pt-[100px]">
        <div className="mx-auto max-w-2xl px-5 pb-20 text-center">
          <div className="mb-8 mt-20 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
              <ShoppingBag className="h-10 w-10" />
            </div>
          </div>
          <h1 className="mb-3 text-[24px] font-bold">Your Cart is Empty</h1>
          <p className="mb-8 text-[14px] text-foreground-muted">
            Looks like you haven&apos;t added anything yet. Browse our collection and find your next phone.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-[12px] bg-white px-8 py-4 text-[14px] font-bold text-black transition hover:bg-[#E5E5E5]"
          >
            <ArrowLeft className="h-4 w-4" /> Browse Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-[80px]">
      <div className="mx-auto max-w-4xl px-5 pb-32">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between pt-4">
          <div>
            <h1 className="text-[28px] font-bold sm:text-[36px]">Cart</h1>
            <p className="mt-1 text-[14px] text-foreground-muted">
              {totalItems} item{totalItems > 1 ? "s" : ""} &middot;{" "}
              {formatPrice(totalPrice)}
            </p>
          </div>
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 rounded-[10px] border border-border-dim px-4 py-2 text-[12px] text-foreground-muted transition hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* ── Items List ── */}
          <div className="flex flex-col gap-3">
            {items.map((ci) => {
              const product = allProducts.find((p) => p.slug === ci.productId);
              return (
                <div
                  key={ci.variantKey}
                  className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  {/* Thumb */}
                  <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-raised">
                    {product?.image && (
                      <Image
                        src={product.image}
                        alt={ci.productId}
                        fill
                        className="object-contain p-2"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/products/${ci.productId}`}
                        className="text-[14px] font-bold text-slate-900 transition hover:text-blue-600"
                      >
                        {product?.name ?? ci.productId}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-foreground-muted">
                        {ci.ram} &middot; {ci.storage}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(ci.variantKey, ci.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[28px] text-center text-[14px] font-medium">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(ci.variantKey, ci.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[14px] font-bold">
                          {formatPrice(ci.price * ci.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(ci.variantKey)}
                          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-foreground-subtle transition hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Checkout Form ── */}
          <div>
            <div className="sticky top-[100px] rounded-[16px] border border-border-dim bg-card p-6">
              <h2 className="mb-6 text-[16px] font-bold">Order Details</h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={form.customerName}
                    onChange={updateField("customerName")}
                    className={`${inputClass} pl-11`}
                    required
                  />
                </div>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={form.phone}
                    onChange={updateField("phone")}
                    className={`${inputClass} pl-11`}
                    required
                  />
                </div>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={form.email}
                    onChange={updateField("email")}
                    className={`${inputClass} pl-11`}
                  />
                </div>

                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="text"
                    placeholder="City *"
                    value={form.city}
                    onChange={updateField("city")}
                    className={`${inputClass} pl-11`}
                    required
                  />
                </div>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="text"
                    placeholder="Pincode *"
                    value={form.pincode}
                    onChange={updateField("pincode")}
                    className={`${inputClass} pl-11`}
                    required
                  />
                </div>

                <div className="relative">
                  <FileText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-foreground-subtle" />
                  <textarea
                    placeholder="Delivery Address *"
                    value={form.address}
                    onChange={updateField("address")}
                    className={`${inputClass} min-h-[80px] resize-none pl-11 pt-3`}
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Notes (optional) — e.g. preferred time, exchange offer"
                  value={form.notes}
                  onChange={updateField("notes")}
                  className={inputClass}
                />

                {/* Order Summary */}
                <div className="mt-2 rounded-[12px] border border-border-dim bg-raised p-4">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-foreground-muted">Subtotal</span>
                    <span className="font-medium">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[13px]">
                    <span className="text-foreground-muted">Delivery</span>
                    <span className="font-medium text-[#4ade80]">Free</span>
                  </div>
                  <div className="my-3 border-t border-border-dim" />
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="font-bold">Total</span>
                    <span className="text-[18px] font-bold">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] bg-whatsapp py-[14px] text-[15px] font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-5 w-5" />
                  {submitting ? "Submitting..." : "Enquire via WhatsApp"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
