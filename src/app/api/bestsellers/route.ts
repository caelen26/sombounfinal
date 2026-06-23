import { NextResponse } from "next/server";
import { getProducts } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Returns up to 4 products for the homepage best-sellers section, sourced from
// the cached product list (so this does not call Stripe directly). Priority:
//   1. Products flagged in metadata: featured / bestseller === "true"
//   2. Lower metadata.rank first
//   3. Otherwise the order Stripe returned them
export async function GET() {
  const products = await getProducts();

  const ranked = [...products].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (a.rank ?? 999) - (b.rank ?? 999);
  });

  return NextResponse.json(ranked.slice(0, 4));
}
