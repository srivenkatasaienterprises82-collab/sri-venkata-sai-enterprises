import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/data/siteConfig";

const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const GOOGLE_APPS_SCRIPT_SECRET = process.env.GOOGLE_APPS_SCRIPT_SECRET;
const _rawOwnerWhatsApp = process.env.OWNER_WHATSAPP_NUMBER;
const OWNER_WHATSAPP_NUMBER = _rawOwnerWhatsApp ?? siteConfig.whatsappNumber;

// ── In-memory rate limiter (per-instance; effective for burst protection on warm instances) ──
interface RateEntry {
  count: number;
  resetAt: number;
}
const rateMap = new Map<string, RateEntry>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

// ── Cleanup stale entries periodically ──
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateMap) {
      if (now > entry.resetAt + RATE_WINDOW_MS) rateMap.delete(key);
    }
  }, RATE_WINDOW_MS);
}

interface OrderItem {
  productName: string;
  productSlug: string;
  selectedStorage: string;
  selectedRam?: string;
  selectedColor: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

interface OrderPayload {
  productName?: string;
  productSlug?: string;
  selectedStorage?: string;
  selectedRam?: string;
  selectedColor?: string;
  productPrice?: string;
  cartItems?: OrderItem[];
  cartTotal?: number;
  customerName: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  pincode: string;
  notes?: string;
  submittedAt: string;
}

function validateOrder(data: unknown): data is OrderPayload {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  const required = ["customerName", "phone", "city", "address", "pincode"];
  const hasCustomerFields = required.every(
    (field) => typeof obj[field] === "string" && obj[field].trim().length > 0
  );

  const hasSingleProduct =
    typeof obj.productName === "string" &&
    obj.productName.trim().length > 0 &&
    typeof obj.productSlug === "string" &&
    obj.productSlug.trim().length > 0;

  const hasCartItems =
    Array.isArray(obj.cartItems) &&
    obj.cartItems.length > 0 &&
    obj.cartItems.every((item) => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Record<string, unknown>;
      return (
        typeof entry.productName === "string" &&
        typeof entry.productSlug === "string" &&
        (entry.selectedRam === undefined || typeof entry.selectedRam === "string") &&
        typeof entry.selectedStorage === "string" &&
        typeof entry.selectedColor === "string" &&
        typeof entry.quantity === "number" &&
        entry.quantity > 0 &&
        typeof entry.price === "number" &&
        typeof entry.lineTotal === "number"
      );
    });

  return hasCustomerFields && (hasSingleProduct || hasCartItems);
}

function buildWhatsAppMessage(order: OrderPayload): string {
  const lines = ["Hi, I placed an order enquiry from the website.", ""];

  if (order.cartItems?.length) {
    lines.push("Cart Items:");
    order.cartItems.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.productName}`,
        ` Variant: ${item.selectedStorage}`,
        ` Color: ${item.selectedColor}`,
        ...(item.selectedRam ? [` RAM: ${item.selectedRam}`] : []),
        ` Qty: ${item.quantity}`,
        ` Price: ₹${item.price.toLocaleString("en-IN")}`,
        ` Line Total: ₹${item.lineTotal.toLocaleString("en-IN")}`
      );
    });
    if (typeof order.cartTotal === "number") {
      lines.push("", `Cart Total: ₹${order.cartTotal.toLocaleString("en-IN")}`);
    }
  } else if (order.productName) {
    lines.push(`Product: ${order.productName}`);
    if (order.selectedStorage) lines.push(`Storage: ${order.selectedStorage}`);
    if (order.selectedRam) lines.push(`RAM: ${order.selectedRam}`);
    if (order.selectedColor) lines.push(`Color: ${order.selectedColor}`);
    if (order.productPrice) lines.push(`Price: ${order.productPrice}`);
  }

  lines.push(
    "",
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
    ...(order.email ? [`Email: ${order.email}`] : []),
    `City: ${order.city}`,
    `Pincode: ${order.pincode}`,
    `Address: ${order.address}`,
    ...(order.notes ? ["", `Notes: ${order.notes}`] : []),
    "",
    "Please confirm availability, EMI, exchange offer, and final price."
  );

  return encodeURIComponent(lines.join("\n"));
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit ──
    const ip = getClientIp(request);
    const rateResult = checkRateLimit(ip);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    // ── Env guard in production ──
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && !GOOGLE_APPS_SCRIPT_URL) {
      console.error("Missing GOOGLE_APPS_SCRIPT_URL in production");
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please contact us directly." },
        { status: 503 }
      );
    }

    // ── Validate GAS integration is usable in prod ──
    if (isProd && GOOGLE_APPS_SCRIPT_URL && !GOOGLE_APPS_SCRIPT_SECRET) {
      console.error("GOOGLE_APPS_SCRIPT_URL set without GOOGLE_APPS_SCRIPT_SECRET in production");
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please contact us directly." },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!validateOrder(body)) {
      return NextResponse.json(
        { error: "Invalid order data. Required fields missing." },
        { status: 400 }
      );
    }

    const order: OrderPayload = {
      ...body,
      submittedAt: new Date().toISOString(),
    };

    let whatsappUrl = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${buildWhatsAppMessage(order)}`;

    if (GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_SECRET) {
      try {
        // Token is passed in the request body so it never appears in URLs or logs.
        const gasResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...order,
            token: GOOGLE_APPS_SCRIPT_SECRET,
          }),
        });

        if (!gasResponse.ok) {
          console.error("Google Apps Script error:", await gasResponse.text());
        } else {
          const gasData = await gasResponse.json();
          if (gasData?.whatsappUrl) {
            whatsappUrl = gasData.whatsappUrl;
          }
        }
      } catch (gasError) {
        console.error("Google Apps Script request failed:", gasError);
      }
    }

    return NextResponse.json({
      success: true,
      whatsappUrl,
      orderId: `ORD-${Date.now()}`,
    });
  } catch (error) {
    console.error("Order API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
