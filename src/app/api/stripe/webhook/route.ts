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

// Refresh the cached catalog so stock/price/availability changes show up
// immediately instead of waiting for the time-based backstop.
function revalidateCatalog() {
  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/shop");
}

/**
 * On a completed order, subtract the purchased quantity from each product's
 * `inventory` metadata (clamped at 0, so it lands on "Sold Out"). Products with
 * no `inventory` value are left untouched (treated as always in stock).
 *
 * Idempotent: stamps the session with `inventory_applied` so a webhook retry
 * doesn't decrement the same order twice. Returns true if any stock changed.
 */
async function applyInventoryForSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  // A webhook retry re-delivers the SAME (frozen) event payload, so check the
  // LIVE session for our marker rather than trusting the event's snapshot.
  try {
    const live = await stripe.checkout.sessions.retrieve(session.id);
    if (live.metadata?.inventory_applied === "true") {
      console.log(`[Stripe webhook] inventory already applied for ${session.id}; skipping`);
      return false;
    }
  } catch (err) {
    console.error("[Stripe webhook] idempotency check failed:", err);
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  // Sum quantity per product (a product can appear on more than one line).
  const purchased = new Map<string, { product: Stripe.Product; qty: number }>();
  for (const item of lineItems.data) {
    const product = item.price?.product;
    const qty = item.quantity ?? 0;
    if (!product || typeof product === "string" || qty <= 0) continue;
    const prod = product as Stripe.Product;
    const entry = purchased.get(prod.id);
    if (entry) entry.qty += qty;
    else purchased.set(prod.id, { product: prod, qty });
  }

  let changed = false;
  for (const { product, qty } of Array.from(purchased.values())) {
    const raw = product.metadata?.inventory;
    // Untracked (blank/missing) → leave as always-in-stock.
    if (raw === undefined || raw.trim() === "") continue;
    const current = Number(raw);
    if (!Number.isFinite(current)) continue;
    const next = Math.max(0, current - qty);
    if (next === current) continue;
    try {
      await stripe.products.update(product.id, {
        metadata: { ...product.metadata, inventory: String(next) },
      });
      changed = true;
      console.log(`[Stripe webhook] ${product.id} inventory ${current} → ${next} (-${qty})`);
    } catch (err) {
      console.error(`[Stripe webhook] failed to update inventory for ${product.id}:`, err);
    }
  }

  // Stamp the session so a retry is a no-op (see idempotency note above).
  try {
    await stripe.checkout.sessions.update(session.id, {
      metadata: { ...(session.metadata ?? {}), inventory_applied: "true" },
    });
  } catch (err) {
    console.error("[Stripe webhook] could not mark session processed:", err);
  }

  return changed;
}

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
    revalidateCatalog();
    console.log(`[Stripe webhook] ${event.type} → revalidated product catalog`);
  } else if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const changed = await applyInventoryForSession(stripe, session);
      if (changed) revalidateCatalog();
    } catch (err) {
      // Log and still 200: returning an error makes Stripe retry, and a retry
      // that re-runs a partially-applied order risks double-decrementing.
      console.error("[Stripe webhook] failed to apply inventory:", err);
    }
  }

  return NextResponse.json({ received: true });
}
