"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Send } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { siteConfig } from "@/lib/data/siteConfig";

const subjectOptions = [
  "Phone availability",
  "EMI details",
  "Exchange offer",
  "Accessories",
  "Store visit",
  "Other",
];

export function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    subject: subjectOptions[0],
    message: "",
  });
  // Stable unique ids so each <label htmlFor> points at its own field.
  const fieldId = {
    name: useId(),
    phone: useId(),
    subject: useId(),
    message: useId(),
  };

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error("Please fill name, phone, and message.");
      return;
    }

    const text = [
      `Hi, I have a website enquiry for ${siteConfig.storeName}.`,
      "",
      `Name: ${form.name.trim()}`,
      `Phone: ${form.phone.trim()}`,
      `Subject: ${form.subject}`,
      `Message: ${form.message.trim()}`,
      "",
      "Please call or WhatsApp me when available.",
    ].join("\n");

    toast.success("Opening WhatsApp with your enquiry...");
    window.location.href = `${siteConfig.whatsappUrl}?text=${encodeURIComponent(text)}`;
  }

  return (
    <section className="bg-slate-50 px-6 py-24 sm:px-8" id="contact">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-blue-600">
            Get in touch
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Visit Our Store
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-lg text-slate-600">
            Come see, touch, and compare smartphones in person. Get personal buying help from our expert team.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-start">
          {/* Left: Info & Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-2">Store Address</p>
                  <address className="text-sm not-italic text-slate-600 leading-relaxed">
                    {siteConfig.address.line1}<br />
                    {siteConfig.address.line2}<br />
                    {siteConfig.address.line3}<br />
                    {siteConfig.address.line4}
                  </address>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-2">Contact Us</p>
                    <a
                      href={`tel:${siteConfig.phoneTel}`}
                      className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors block"
                    >
                      {siteConfig.phoneDisplay}
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-2">Store Hours</p>
                    <p className="text-sm text-slate-600">
                      {siteConfig.hours}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <iframe
                title="Sri Venkata Sai Enterprises location map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3843.5!2d80.0486!3d15.5037!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4b74db39b94b4b%3A0x8cce8e2a5e7d5a0!2sOngole%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000"
                className="h-[280px] w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>

          {/* Right: Lead form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg lg:p-10"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Request a Callback</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Share what you need and we will confirm price, stock, EMI, or exchange details instantly on WhatsApp.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <label htmlFor={fieldId.name} className="text-sm font-semibold text-slate-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={fieldId.name}
                      required
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor={fieldId.phone} className="text-sm font-semibold text-slate-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={fieldId.phone}
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor={fieldId.subject} className="text-sm font-semibold text-slate-700">
                    Subject
                  </label>
                  <select
                    id={fieldId.subject}
                    value={form.subject}
                    onChange={(event) => updateField("subject", event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  >
                    {subjectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor={fieldId.message} className="text-sm font-semibold text-slate-700">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id={fieldId.message}
                    required
                    value={form.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    className="min-h-32 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Example: Need Vivo T4 Ultra 256GB in Gold, please share EMI and exchange details."
                  />
                </div>

                <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    type="submit"
                    variant="whatsapp"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Send className="mr-2 h-5 w-5" aria-hidden="true" />
                    Send on WhatsApp
                  </Button>
                  <p className="text-xs text-slate-500 text-center sm:text-left">
                    We typically reply within 15 minutes during store hours.
                  </p>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
