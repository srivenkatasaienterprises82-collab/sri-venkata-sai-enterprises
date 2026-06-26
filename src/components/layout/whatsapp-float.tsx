"use client";

import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";
import type { SanitySiteSettings } from "@/sanity/types";

export function WhatsAppFloat({ settings }: { settings?: SanitySiteSettings }) {
  const whatsappUrl = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber}`
    : siteConfig.whatsappUrl;

  return (
    <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8 animate-fade-in">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
        aria-label="Chat on WhatsApp"
      >
        {/* Pulse Effect */}
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-whatsapp opacity-40"></span>
        
        <MessageCircle className="relative z-10 h-7 w-7" />
        
        {/* Tooltip */}
        <span className="absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-slate-900 opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 hidden md:block border border-slate-200">
          Chat with us
        </span>
      </a>
    </div>
  );
}
