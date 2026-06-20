import { getProducts } from "@/lib/stripe";
import ShopClient from "./ShopClient";

// Re-fetch products every 60 seconds so Stripe changes appear without a redeploy
export const revalidate = 60;

export default async function ShopPage() {
  const products = await getProducts();
  return <ShopClient products={products} />;
}
