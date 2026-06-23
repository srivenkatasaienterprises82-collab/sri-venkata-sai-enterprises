import Link from "next/link";
import Image from "next/image";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";
import { getFeaturedBrands } from "@/lib/data/brands";
import type { Brand } from "@/lib/data/brands";
import type { SanitySiteSettings } from "@/sanity/types";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "All Mobiles" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer({
  settings,
  brands,
}: {
  settings?: SanitySiteSettings;
  brands?: Brand[];
}) {
  const displayBrands = brands?.length ? brands.slice(0, 8) : getFeaturedBrands().slice(0, 8);
  const storeName = settings?.companyName || siteConfig.storeName;
  const logoUrl = settings?.logo || "/logo.jpg";
  const phoneDisplay = settings?.phoneDisplay || siteConfig.phoneDisplay;
  const phoneTel = settings?.phoneTel || siteConfig.phoneTel;
  const whatsappUrl = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber}`
    : siteConfig.whatsappUrl;
  const city = settings?.city || siteConfig.address.city;
  const hours = settings?.hours || siteConfig.hours;
  const copyright = settings?.copyrightText || `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`;

  const address = {
    line1: settings?.addressLine1 || siteConfig.address.line1,
    line2: settings?.addressLine2 || siteConfig.address.line2,
    line3: settings?.addressLine3 || siteConfig.address.line3,
    line4: settings?.addressLine4 || siteConfig.address.line4,
  };

  const footerText = settings?.footerText || `${city}'s trusted mobile store for genuine smartphones, personal buying help, EMI, exchange offers, and fast local service.`;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <Section className="border-none pt-16 pb-10" spacing="none" container="default">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={logoUrl}
                alt={`${storeName} logo`}
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl object-cover border border-slate-200 shadow-sm"
              />
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                {storeName}
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-500 leading-relaxed font-medium">
              {footerText}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                variant="whatsapp"
                size="sm"
                as="a"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Us
              </Button>
              <Button
                variant="secondary"
                size="sm"
                as="a"
                href={`tel:${phoneTel}`}
              >
                <Phone className="mr-2 h-4 w-4" /> Call Now
              </Button>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Quick Links</h3>
            <nav className="mt-5 flex flex-col gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Top Brands */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Top Brands</h3>
            <nav className="mt-5 flex flex-col gap-3">
              {displayBrands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/category/${brand.slug}`}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  {brand.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Visit us */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Visit Us</h3>
            <div className="mt-5 space-y-4 text-slate-500 font-medium">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <address className="not-italic text-sm leading-relaxed">
                  {address.line1}<br />
                  {address.line2}<br />
                  {address.line3}<br />
                  {address.line4}
                </address>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <a href={`tel:${phoneTel}`} className="text-sm hover:text-blue-600 transition">
                  {phoneDisplay}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm">{hours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 md:flex-row">
          <p className="text-sm font-medium text-slate-500">
            {copyright}
          </p>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/privacy" className="hover:text-blue-600 transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-blue-600 transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </Section>
    </footer>
  );
}
export default Footer;