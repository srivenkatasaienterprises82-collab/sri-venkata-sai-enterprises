import { OrderForm } from "@/components/sections/order-form";
import { Footer } from "@/components/sections/footer";
import { notFound } from "next/navigation";
import { getAllProducts } from "@/lib/data/products";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Securely checkout your order at Sri Venkata Sai Enterprises.",
  alternates: { canonical: "/checkout" },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawProduct = typeof params.product === "string" ? params.product : undefined;
  const variant = typeof params.variant === "string" ? params.variant : undefined;
  const color = typeof params.color === "string" ? params.color : undefined;
  const ram = typeof params.ram === "string" ? params.ram : undefined;
  const storage = typeof params.storage === "string" ? params.storage : undefined;

  const productId = rawProduct && getAllProducts().some((item) => item.slug === rawProduct)
    ? rawProduct
    : undefined;

  if (!productId) {
    notFound();
  }

  return (
    <>
      <main>
        <OrderForm productId={productId} variant={variant} color={color} ram={ram} storage={storage} />
      </main>
      <Footer />
    </>
  );
}
