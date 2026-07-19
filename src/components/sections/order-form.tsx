"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { getProductBySlug, formatPrice, isPriceOnEnquiry } from "@/lib/data/products";
import { siteConfig } from "@/lib/data/siteConfig";

// WhatsApp icon SVG component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

export function OrderForm({ productId, variant, color, ram, storage }: { productId: string; variant?: string; color?: string; ram?: string; storage?: string }) {
  const product = getProductBySlug(productId);
  
  // Default values if product isn't found
  const productName = product?.name || "Premium Smartphone";
  const productImage = product?.image || "/images/products/iqoo-z11x/1.png";
  const productColor = product?.colors?.[0]?.name || "Default Color";
  
  // Find specific variant or use first one
  const selectedVariant = product?.variants.find(v => `${v.ram}-${v.storage}` === variant) 
    || product?.variants?.[0];
    
  const price = selectedVariant?.flipkartPrice ?? product?.flipkartPrice ?? selectedVariant?.price;
  const priceDisplay = isPriceOnEnquiry(product!) || !price ? "Price on Enquiry" : formatPrice(price);
  const storageStr = selectedVariant ? `${selectedVariant.ram} / ${selectedVariant.storage}` : "128GB";

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Append product details
    const orderData = {
      ...data,
      productName,
      productSlug: productId,
      selectedColor: color ?? "",
      selectedRam: ram ?? "",
      selectedStorage: storage ?? variant ?? "",
      productPrice: priceDisplay,
      customerName: data.name,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();
      
      if (result.success && result.whatsappUrl) {
        window.location.href = result.whatsappUrl;
      } else {
        alert("Something went wrong. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting order.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pt-[100px] pb-[80px]">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Complete Your Order</h1>
          <p className="mt-3 text-base text-slate-500 font-medium">Fast, secure checkout via WhatsApp.</p>
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-8 lg:gap-12">
          
          {/* Left Column: Form (60%) */}
          <div className="w-full md:w-3/5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input required name="name" type="text" className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" placeholder="Enter your full name" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input required name="phone" type="tel" pattern="[0-9]{10}" className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" placeholder="10-digit number" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input name="email" type="email" className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" placeholder="your@email.com" />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea required name="address" rows={3} className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm resize-none" placeholder="House/Flat No, Street, Landmark" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input required name="city" type="text" defaultValue={siteConfig.address.city} className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" placeholder="Enter your city" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input required name="pincode" type="text" pattern="[0-9]{6}" className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" placeholder="6-digit PIN" />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Order Notes <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input name="notes" type="text" className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" placeholder="Any special requests?" />
                </div>
              </div>

              {/* Sticky Mobile CTA / Regular Desktop CTA */}
              <div className="sticky bottom-4 z-50 mt-4 md:static md:mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-700 hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:hover:bg-blue-600"
                >
                  {isSubmitting ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <WhatsAppIcon className="h-6 w-6" />
                      Place Order & WhatsApp
                    </>
                  )}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium pb-8 md:pb-0">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Your details are secure. No payment required right now.
              </div>

            </form>
          </div>

          {/* Right Column: Order Summary (40%) */}
          <div className="w-full md:w-2/5">
            <div className="sticky top-[100px] rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
              <h2 className="mb-6 text-xl font-extrabold text-slate-900 tracking-tight">Order Summary</h2>
              
              <div className="flex gap-5 mb-8">
                <div className="relative h-[100px] w-[100px] shrink-0 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shadow-sm">
                  <Image src={productImage} alt={productName} fill className="object-contain p-2 mix-blend-multiply transition-transform hover:scale-105 duration-500" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{productName}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-0.5">{storageStr}</p>
                  <p className="text-sm font-medium text-slate-500">{productColor}</p>
                </div>
              </div>
              
              <div className="h-px w-full bg-slate-100 my-6"></div>
              
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-600 uppercase tracking-wider">Total Price</span>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{priceDisplay}</span>
              </div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
