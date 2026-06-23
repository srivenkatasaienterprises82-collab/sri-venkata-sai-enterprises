import { redirect } from "next/navigation";

// /mobiles previously re-exported /products, serving duplicate content under
// the canonical "/products". Redirect to the canonical URL instead.
export default function MobilesPage() {
  redirect("/products");
}
