import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Returns up to 4 products for the homepage best-sellers section.
// Priority order:
//   1. Products with Stripe metadata `featured: "true"` or `bestseller: "true"`
//   2. Products with metadata `rank: "1"`, `rank: "2"`, etc. (lower = higher priority)
//   3. Everything else, in the order Stripe returns them
//
// To mark a product as featured, add metadata in the Stripe Dashboard:
//   Key: featured   Value: true
// Optionally add `rank: "1"` etc. to control order among featured products.

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

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_REPLACE")) {
    return NextResponse.json([
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
    ]);
  }

  try {
    const stripe = new Stripe(key);
    const { data } = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ["data.default_price"],
    });

    const annotated = data.map((p) => ({
      featured:
        p.metadata?.featured === "true" || p.metadata?.bestseller === "true",
      rank: parseInt(p.metadata?.rank ?? "999", 10),
      product: p,
    }));

    annotated.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.rank - b.rank;
    });

    const mapped = annotated.slice(0, 4).map(({ product: p }) => {
      const price = p.default_price as Stripe.Price | null;
      const primaryImage = p.images[0] ?? "/refined-num-image.png";
      return {
        id: p.id,
        name: p.name,
        price: price?.unit_amount ? price.unit_amount / 100 : 0,
        currency: price?.currency ?? "cad",
        image: primaryImage,
        images: p.images.length > 0 ? p.images : [primaryImage],
        description: p.description ?? undefined,
        priceId: price?.id,
        features: p.metadata?.features
          ? p.metadata.features.split("|").map((s: string) => s.trim()).filter(Boolean)
          : undefined,
        ingredients: p.metadata?.ingredients
          ? p.metadata.ingredients.split("|").map((s: string) => s.trim()).filter(Boolean)
          : undefined,
      };
    });

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("[Stripe] bestsellers fetch failed:", err);
    return NextResponse.json([]);
  }
}
