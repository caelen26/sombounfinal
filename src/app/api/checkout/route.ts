import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

type CartLine = {
  priceId?: string;
  name: string;
  price: number;
  currency: string;
  image?: string;
  quantity: number;
};

// Countries you ship to. Add ISO codes to allow more at checkout,
// e.g. ["CA", "US"] to also ship to the United States.
const SHIP_TO_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection["allowed_countries"] =
  ["CA"];

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let body: { items?: CartLine[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Derive the redirect origin from the request itself rather than trusting a
  // client-supplied value, which avoids an open-redirect surface on the
  // success/cancel URLs.
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    // A Stripe-hosted product image must be an absolute https URL.
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

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      // Require a billing address (helps card verification).
      billing_address_collection: "required",
      // Collect a shipping address for the physical products.
      shipping_address_collection: { allowed_countries: SHIP_TO_COUNTRIES },
      // Show a promo / discount code field on the checkout page. Codes are
      // created in the Stripe Dashboard under Products → Coupons / Promotion codes.
      allow_promotion_codes: true,
      success_url: `${origin}/shop?order=success`,
      cancel_url: `${origin}/shop`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe] checkout session failed:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 502 });
  }
}
