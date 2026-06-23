import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import Stripe from "stripe";
import { getStripe, PRODUCTS_CACHE_TAG } from "@/lib/stripe";

// Stripe must reach this with the raw body intact for signature verification,
// so this route runs on the Node runtime and reads the body as text.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Product/price changes that should refresh the cached catalog. Because we
// re-fetch the whole active product list on refresh, deletions and archivals
// drop out automatically — nothing is stored or patched locally.
const REVALIDATE_EVENTS = new Set([
  "product.created",
  "product.updated",
  "product.deleted",
  "price.created",
  "price.updated",
  "price.deleted",
]);

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    console.error("[Stripe webhook] Missing Stripe client or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    // Signature didn't verify → reject. This is what blocks spoofed requests.
    console.error("[Stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (REVALIDATE_EVENTS.has(event.type)) {
    revalidateTag(PRODUCTS_CACHE_TAG);
    revalidatePath("/");
    revalidatePath("/shop");
    console.log(`[Stripe webhook] ${event.type} → revalidated product catalog`);
  }

  return NextResponse.json({ received: true });
}
