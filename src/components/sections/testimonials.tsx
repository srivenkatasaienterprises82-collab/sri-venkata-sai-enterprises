"use client";

import { Section } from "@/components/layout/section";
import { GradientText } from "@/components/ui/gradient-text";
import { getAllTestimonials } from "@/lib/data/testimonials";
import { Quote, Star } from "lucide-react";
import { motion } from "framer-motion";

export function Testimonials() {
  const testimonials = getAllTestimonials();

  return (
    <Section className="bg-slate-50">
      <div className="mb-14 text-center">
        <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-blue-600">
          Customer proof
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Trusted by <GradientText>4,500+</GradientText> customers
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Real experiences from customers in and around Ongole.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.slice(0, 6).map((testimonial, index) => (
          <motion.div
            key={`${testimonial.name}-${testimonial.location}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, duration: 0.5 }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.3,
              }}
              className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5"
            >
              <div className="flex gap-3">
              <Quote className="mt-0.5 h-5 w-5 shrink-0 text-blue-500/50" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-slate-600">{testimonial.text}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex gap-0.5" aria-label={`${testimonial.rating} star review`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < testimonial.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {testimonial.source === "google" ? "Google" : "WhatsApp"}
              </span>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                {testimonial.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{testimonial.name}</p>
                <p className="text-xs text-slate-500">{testimonial.location}</p>
              </div>
            </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
