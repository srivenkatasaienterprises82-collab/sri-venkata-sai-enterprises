"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, RefreshCw, CreditCard, Headphones } from "lucide-react";

export function BentoDeals() {
  return (
    <section className="bg-slate-50 px-8 pb-12 pt-6">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">

        {/* 1. FLAGSHIP DEAL (Spans 2 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative flex h-[280px] flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md md:col-span-2"
        >
          <div className="z-10 flex flex-col items-start">
            <span className="mb-3 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">
              Flagship Deal
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">iQOO Z11x 5G</h3>
            <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-500 font-medium">
              Get 0% EMI for up to 12 months with leading bank credit cards.
            </p>
            <div className="mt-auto pt-14">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">₹27,000</span>
            </div>
          </div>
          <div className="absolute -bottom-[20%] -right-[5%] h-[320px] w-[280px]">
            <Image
              src="/images/products/iqoo-z11x/1.png"
              alt="iQOO Z11x 5G"
              fill
              className="object-contain mix-blend-multiply opacity-90 transition-transform hover:scale-105 duration-500"
            />
          </div>
        </motion.div>

        {/* 2. EMI CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex h-[280px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md"
        >
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              EMI Offer
            </span>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">0% EMI</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">
              Up to 12 months on all smartphones above ₹20k. No hidden charges.
            </p>
          </div>
          <button className="flex items-center gap-1.5 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700">
            Available Now <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* 3. EXCHANGE CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex h-[240px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md"
        >
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Exchange Bonus</h3>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Up to ₹15,000</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">
              Bring your old phone to the store for an instant valuation.
            </p>
          </div>
        </motion.div>

        {/* 4. VIVO CARD (Spans 2 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative flex h-[240px] flex-col justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md md:col-span-2"
        >
          <div className="z-10 flex flex-col items-start">
            <span className="mb-3 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600">
              New Arrival
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Vivo T5x 5G</h3>
            <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-500 font-medium">
              Experience the ultimate power of 5G connectivity.
            </p>
            <span className="mt-5 text-3xl font-extrabold text-slate-900 tracking-tight">₹27,000</span>
          </div>
          <div className="absolute -bottom-[30%] -right-[10%] h-[340px] w-[340px]">
            <Image
              src="/images/products/vivo-t5x/1.webp"
              alt="Vivo T5x 5G"
              fill
              className="object-contain mix-blend-multiply opacity-90 transition-transform hover:scale-105 duration-500"
            />
          </div>
        </motion.div>

        {/* 5. ACCESSORIES BANNER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row md:col-span-3 transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Headphones className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Free Accessories Combo</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
                With every Vivo & iQOO smartphone · Limited Period Offer
              </p>
            </div>
          </div>
          <button className="whitespace-nowrap rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 shadow-sm">
            Claim Offer
          </button>
        </motion.div>

      </div>
    </section>
  );
}
