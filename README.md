# Sri Venkata Sai Enterprises — Mobile Store Website

Next.js e-commerce storefront for Sri Venkata Sai Enterprises, a premium mobile retail store in Ongole, Andhra Pradesh. Customers browse products, add to cart, and submit order enquiries via WhatsApp.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Runtime:** React 19
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS 4 + PostCSS
- **Animation:** Framer Motion
- **Notifications:** Sonner

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

Create a `.env.local` (see `.env.example`). At minimum:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Root domain for SEO metadata (e.g. `https://srivsk.in`) |
| `OWNER_WHATSAPP_NUMBER` | No | Fallback WhatsApp number (defaults to `919948618414`) |
| `GOOGLE_APPS_SCRIPT_URL` | No | Optional Google Apps Script webhook to log orders |
| `GOOGLE_APPS_SCRIPT_SECRET` | No | Shared secret for the Apps Script endpoint |

In production, `OWNER_WHATSAPP_NUMBER` must be set. The server will throw on startup otherwise.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
  app/                     # Next.js App Router pages
    api/orders/route.ts    # Order submission API (validates + forwards to GAS/WhatsApp)
    cart/page.tsx          # Shopping cart with checkout form
    checkout/page.tsx      # Single-product order form
    products/[id]/page.tsx # Product detail page
    layout.tsx             # Root layout + SEO metadata
    page.tsx               # Homepage (all sections)
  components/
    layout/                # Nav, footer, WhatsApp float
    sections/              # Page sections (hero, products, FAQ, etc.)
    ui/                    # Reusable UI primitives
  context/CartContext.tsx   # Cart state (useReducer + localStorage)
  lib/
    data/
      products.ts          # Product catalog + helper functions
      siteConfig.ts        # Business details (phone, address, hours)
      brands.ts            # Brand index
      faq.ts               # FAQ content
      products.test.ts     # Unit tests for data helpers
```

## Order Flow

1. Customer adds items to cart (or clicks **Buy Now**)
2. Fills in name, phone, city, pincode, address
3. Submits → `/api/orders` validates the payload
4. Server builds a WhatsApp message and returns a `wa.me` link
5. (Optional) Order is also POSTed to a Google Apps Script for logging
6. Customer is redirected to WhatsApp to confirm

## Deployment

- **Vercel:** recommended — push to main branch, import in Vercel dashboard
- Set `NEXT_PUBLIC_SITE_URL` to your production domain
- Set `OWNER_WHATSAPP_NUMBER` to the business number

## Browser Support

Chrome, Firefox, Safari, Edge (last 2 versions).
