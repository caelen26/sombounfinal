import Stripe from "stripe";

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
};

const fallbackProducts: Product[] = [
  {
    id: "num-body-tallow",
    name: "NŪM Body Tallow",
    price: 29.99,
    currency: "cad",
    image: "/refined-num-image.png",
    images: ["/refined-num-image.png", "/image-2.png"],
  },
  {
    id: "num-face-tallow",
    name: "NŪM Face Tallow",
    price: 29.99,
    currency: "cad",
    image: "/skintallow.png",
    images: ["/skintallow.png", "/image-2.png"],
  },
];

let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_REPLACE")) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export async function getProducts(): Promise<Product[]> {
  const stripe = getStripe();
  if (!stripe) return fallbackProducts;

  try {
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
      };
    });

    return mapped.length > 0 ? mapped : fallbackProducts;
  } catch (err) {
    console.error("[Stripe] Failed to fetch products:", err);
    return fallbackProducts;
  }
}
