import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

type CartLine = {
  priceId?: string;
  name: string;
  price: number;
  currency: string;
  image?: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_REPLACE")) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(key);
  const { items, origin } = (await req.json()) as { items: CartLine[]; origin: string };

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    // Stripe-hosted product images must be absolute URLs
    const images = item.image?.startsWith("https://") ? [item.image] : [];

    if (item.priceId) {
      return { price: item.priceId, quantity: item.quantity };
    }

    return {
      quantity: item.quantity,
      price_data: {
        currency: item.currency || "cad",
        unit_amount: Math.round(item.price * 100),
        product_data: { name: item.name, images },
      },
    };
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    success_url: `${origin}/shop?order=success`,
    cancel_url: `${origin}/shop`,
  });

  return NextResponse.json({ url: session.url });
}
