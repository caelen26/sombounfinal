import Stripe from "stripe";
import { unstable_cache } from "next/cache";

// Cache tag for the Stripe product list. The webhook at /api/stripe/webhook
// calls revalidateTag(PRODUCTS_CACHE_TAG) so product/price changes in Stripe
// show up immediately instead of waiting for the time-based backstop.
export const PRODUCTS_CACHE_TAG = "stripe-products";

export type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  images: string[];
  description?: string;
  priceId?: string;
  features?: string[];    // from Stripe metadata.features (pipe-separated)
  ingredients?: string[]; // from Stripe metadata.ingredients (pipe-separated)
  featured?: boolean;     // from Stripe metadata.featured / bestseller
  rank?: number;          // from Stripe metadata.rank (lower = higher priority)
  stock?: number;         // from Stripe metadata.inventory; undefined = not tracked (in stock)
};

const NUM_DESCRIPTION =
  "Grass-fed cattle are the best source for tallow-based skincare because they are animals that have been pasture-raised, providing a nutrient-rich diet. This results in tallow with a higher concentration of beneficial compounds, such as omega-3 fatty acids and antioxidants. These elements contribute to improved skin hydration, elasticity, and overall skin health.";
const NUM_FEATURES = [
  "Pasture-Raised & Grass-Fed",
  "Rich in Omega-3 & Antioxidants",
  "Deep Hydration & Elasticity",
  "100% Biocompatible",
];
const NUM_INGREDIENTS = [
  "Grass Fed Beef Tallow",
  "Raspberry Seed Oil",
  "Carrot Seed Oil",
  "Frankincense",
  "Calendula",
  "Lavender Oil",
  "Immortelle Oil",
];

const fallbackProducts: Product[] = [
  {
    id: "num-body-tallow",
    name: "NŪM Body Tallow",
    price: 29.99,
    currency: "cad",
    image: "/refined-num-image.png",
    images: ["/refined-num-image.png", "/image-2.png"],
    description: NUM_DESCRIPTION,
    features: NUM_FEATURES,
    ingredients: NUM_INGREDIENTS,
  },
  {
    id: "num-face-tallow",
    name: "NŪM Face Tallow",
    price: 29.99,
    currency: "cad",
    image: "/skintallow.png",
    images: ["/skintallow.png", "/image-2.png"],
    description: NUM_DESCRIPTION,
    features: NUM_FEATURES,
    ingredients: NUM_INGREDIENTS,
  },
];

let stripeClient: Stripe | null = null;

/**
 * Returns a configured Stripe client, or null when no usable key is present.
 *
 * Accepts standard secret keys (sk_live_/sk_test_) and — preferred for
 * production — restricted keys (rk_live_/rk_test_). The regex guard means a
 * placeholder value (e.g. "sk_REPLACE_ME") is treated as "not configured",
 * so the app falls back to local product data instead of throwing.
 *
 * This key is read server-side only (no NEXT_PUBLIC_ prefix) and is never
 * sent to the browser.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_(live|test)_/.test(key)) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Inventory comes from a product's Stripe metadata `inventory` field (a number).
// Missing/blank → undefined, which the UI treats as "in stock" (untracked).
function parseStock(raw?: string): number | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchProductsFromStripe(): Promise<Product[]> {
  const stripe = getStripe();
  if (!stripe) return fallbackProducts;

  const { data } = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ["data.default_price"],
  });

  const mapped = data.map((p): Product => {
    const price = p.default_price as Stripe.Price | null;
    const amount = price?.unit_amount ? price.unit_amount / 100 : 0;
    const currency = price?.currency ?? "cad";
    const primaryImage = p.images[0] ?? "/refined-num-image.png";
    return {
      id: p.id,
      name: p.name,
      price: amount,
      currency,
      image: primaryImage,
      images: p.images.length > 0 ? p.images : [primaryImage],
      description: p.description ?? undefined,
      priceId: price?.id,
      features: p.metadata?.features
        ? p.metadata.features.split("|").map((s) => s.trim()).filter(Boolean)
        : undefined,
      ingredients: p.metadata?.ingredients
        ? p.metadata.ingredients.split("|").map((s) => s.trim()).filter(Boolean)
        : undefined,
      featured:
        p.metadata?.featured === "true" || p.metadata?.bestseller === "true",
      rank: parseInt(p.metadata?.rank ?? "999", 10),
      stock: parseStock(p.metadata?.inventory),
    };
  });

  return mapped.length > 0 ? mapped : fallbackProducts;
}

// Cache the Stripe product list in Next's Data Cache so we don't hit the Stripe
// API on every request. Freshness is driven by the webhook (revalidateTag); the
// 1-hour `revalidate` is only a backstop in case a webhook event is missed.
const getCachedProducts = unstable_cache(
  fetchProductsFromStripe,
  ["stripe-products-list"],
  { tags: [PRODUCTS_CACHE_TAG], revalidate: 3600 },
);

export async function getProducts(): Promise<Product[]> {
  // Not configured → return the fallback directly without caching it.
  if (!getStripe()) return fallbackProducts;
  try {
    return await getCachedProducts();
  } catch (err) {
    // A transient Stripe error throws out of the cached fn (so the failure is
    // NOT stored); serve the fallback for this request and retry next time.
    console.error("[Stripe] Failed to fetch products:", err);
    return fallbackProducts;
  }
}
