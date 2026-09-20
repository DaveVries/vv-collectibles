import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNotification, fetchAllOrderResults, mapOrderStatus } from "@/lib/rabo";
import { markOrderPaid, markOrderUnpaid } from "@/lib/order-finalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rabo OnlineKassa notification endpoint.
 *
 * Rabo does not push order statuses here. It posts a short-lived token, and
 * we call back with that token to pull the finished order results — so the
 * status we act on always comes from an authenticated Rabo response, never
 * from the request body.
 *
 * Register this URL as the webhook in the Rabo dashboard:
 *   https://<your-domain>/api/webhooks/rabo
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const notification = parseNotification(body);
  if (!notification) {
    // Malformed, unsigned, or expired. 400 so Rabo surfaces it in the
    // dashboard rather than silently retrying a request we will never accept.
    return NextResponse.json({ error: "invalid notification" }, { status: 400 });
  }

  let results;
  try {
    results = await fetchAllOrderResults(notification.authentication);
  } catch (e) {
    console.error("rabo order-results error", e);
    // 500 so Rabo retries — the notification itself was valid.
    return NextResponse.json({ error: "could not fetch order results" }, { status: 500 });
  }

  for (const result of results) {
    // merchantOrderId is our own order number (set when announcing).
    const order = await prisma.order.findUnique({
      where: { number: result.merchantOrderId },
    });
    if (!order) {
      console.warn("rabo: unknown merchantOrderId", result.merchantOrderId);
      continue;
    }

    // Keep the Rabo reference if the announce response never landed.
    if (!order.paymentRef && result.omnikassaOrderId) {
      await prisma.order
        .update({ where: { id: order.id }, data: { paymentRef: result.omnikassaOrderId } })
        .catch(() => {});
    }

    const status = mapOrderStatus(result.orderStatus);

    if (status === "PAID") {
      await markOrderPaid(order.id, { method: "rabo" });
    } else {
      await markOrderUnpaid(order.id, status);
    }
  }

  return NextResponse.json({ ok: true, processed: results.length });
}
