"use client";

import { useState } from "react";
import { Section } from "@/components/layout/section";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { faqs } from "@/lib/data/faq";
import { siteConfig } from "@/lib/data/siteConfig";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section className="border-y border-slate-200 bg-slate-50">
      <div className="text-center mb-14">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-slate-500 font-medium">
          Quick answers to common questions. Can&apos;t find yours?{" "}
          <a
            href={siteConfig.whatsappUrl}
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            WhatsApp us
          </a>
        </p>
      </div>

      <div className="mx-auto max-w-3xl flex flex-col gap-4">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-sm"
          >
            <button
              onClick={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
              className="flex w-full items-center justify-between gap-4 p-6 text-left focus:outline-none"
            >
              <span className="font-bold text-slate-900 pr-8 text-lg">
                {faq.question}
              </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className={`flex items-center justify-center h-8 w-8 rounded-full ${openIndex === index ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}
              >
                <ChevronDown className="h-5 w-5 shrink-0" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="overflow-hidden"
                >
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    className="px-6 pb-6 pt-2 text-[15px] text-slate-600 leading-relaxed font-medium"
                  >
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Visually-hidden copy kept in the DOM at all times so the answer
                text is crawlable (SEO / FAQ rich results) even when collapsed. */}
            <p className="sr-only" id={`faq-answer-static-${index}`}>
              {faq.question}: {faq.answer}
            </p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
