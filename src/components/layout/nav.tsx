"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, MessageCircle, ShoppingBag, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { ProductSearch } from "./product-search";
import { siteConfig } from "@/lib/data/siteConfig";
import type { SanitySiteSettings } from "@/sanity/types";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Mobiles" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Nav({ settings }: { settings?: SanitySiteSettings }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { totalItems } = useCart();

  const storeName = settings?.companyName || siteConfig.storeName;
  const logoUrl = settings?.logo || "/logo.jpg";
  const phoneTel = settings?.phoneTel || siteConfig.phoneTel;
  const whatsappUrl = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber}`
    : siteConfig.whatsappUrl;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/products")
      return (
        pathname === "/products" ||
        pathname === "/mobiles" ||
        pathname.startsWith("/category/")
      );
    return pathname.startsWith(href.split("?")[0]);
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500 ease-out",
        scrolled
          ? "border-b border-slate-200/80 bg-white/85 backdrop-blur-lg shadow-sm py-0"
          : "bg-white/0 backdrop-blur-none border-b border-transparent py-2"
      )}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 shrink-0"
            aria-label={`${storeName} — home`}
          >
            <Image
              src={logoUrl}
              alt={`${storeName} logo`}
              width={40}
              height={40}
              className="h-8 w-8 md:h-10 md:w-10 shrink-0 rounded-lg object-cover"
              priority
            />
            <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg whitespace-nowrap">
              {storeName}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-none items-center justify-center gap-5 lg:flex xl:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center px-1 text-sm font-semibold transition-colors",
                  isActive(link.href) ? "text-blue-600" : "text-slate-600 hover:text-blue-600"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 lg:flex min-w-0 flex-none justify-end xl:gap-5">
            <div className="min-w-[180px] max-w-[280px] xl:max-w-md mr-1 shrink">
              <ProductSearch />
            </div>
            <Button variant="secondary" size="sm" as="a" href={`tel:${phoneTel}`} className="px-3 xl:px-4 shrink-0">
              <Phone className="h-4 w-4 xl:mr-1.5" />
              <span className="hidden xl:inline">Call Now</span>
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              as="a"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 xl:px-4 shrink-0"
            >
              <MessageCircle className="h-4 w-4 xl:mr-1.5" />
              <span className="hidden xl:inline">WhatsApp</span>
            </Button>
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-blue-600"
              aria-label={`Cart${
                totalItems > 0
                  ? ` (${totalItems} item${totalItems > 1 ? "s" : ""})`
                  : ""
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile menu and search toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (open) setOpen(false);
              }}
              aria-label="Toggle search"
              aria-expanded={searchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              onClick={() => {
                setOpen(!open);
                if (searchOpen) setSearchOpen(false);
              }}
              aria-label="Toggle navigation"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] as const }}
            className="overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden shadow-lg"
          >
            <div className="p-4">
              <ProductSearch onSelect={() => setSearchOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile nav */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] as const }}
            className="overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden shadow-lg"
          >
            <div className="flex flex-col gap-2 px-5 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-semibold transition",
                    isActive(link.href) ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  as="a"
                  href={`tel:${phoneTel}`}
                  className="flex-1 justify-center"
                >
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Call
                </Button>
                <Button
                  variant="whatsapp"
                  size="sm"
                  as="a"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 justify-center"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              </div>
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
              >
                <ShoppingBag className="h-4 w-4" />
                Cart
                {totalItems > 0 && (
                  <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
