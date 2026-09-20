import type { OrderStatus, PaymentStatus } from "@prisma/client";

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", cls: "bg-amber-100 text-amber-800" },
  PROCESSING: { label: "In verwerking", cls: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Voltooid", cls: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Geannuleerd", cls: "bg-red-100 text-red-700" },
};

const PAYMENT: Partial<Record<PaymentStatus, { label: string; cls: string }>> = {
  PAID: { label: "Betaald", cls: "bg-green-100 text-green-800" },
  OPEN: { label: "Open", cls: "bg-navy/10 text-navy/60" },
  FAILED: { label: "Mislukt", cls: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Verlopen", cls: "bg-red-100 text-red-700" },
  CANCELED: { label: "Geannuleerd", cls: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Terugbetaald", cls: "bg-purple-100 text-purple-700" },
};

export function OrderStatusBadge({
  status,
  paymentStatus,
}: {
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
}) {
  const s = STATUS[status];
  const p = paymentStatus ? PAYMENT[paymentStatus] : undefined;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`badge ${s.cls}`}>{s.label}</span>
      {p && <span className={`badge ${p.cls}`}>{p.label}</span>}
    </span>
  );
}
