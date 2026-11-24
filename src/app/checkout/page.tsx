import { OrderForm } from "@/components/sections/order-form";
import { Footer } from "@/components/sections/footer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sanityFetchNoCache } from "@/sanity/lib/live";
import { PRODUCT_BY_SLUG_QUERY } from "@/sanity/queries";
import { toProduct } from "@/sanity/transform";
import type { SanityProduct } from "@/sanity/types";

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

  // Products live only in Sanity: an unknown slug is a 404.
  const { data: sanityProduct } = (await sanityFetchNoCache({
    query: PRODUCT_BY_SLUG_QUERY,
    params: { slug: rawProduct, id: rawProduct },
  })) as { data: SanityProduct | null };

  if (!sanityProduct) {
    notFound();
  }

  const product = toProduct(sanityProduct);

  return (
    <>
      <main>
        <OrderForm product={product} variant={variant} color={color} ram={ram} storage={storage} />
      </main>
      <Footer />
    </>
  );
}
