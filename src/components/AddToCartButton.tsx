"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/components/CartProvider";

export function AddToCartButton({
  item,
  disabled,
  className,
}: {
  item: Omit<CartItem, "quantity">;
  disabled?: boolean;
  className?: string;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  if (disabled) {
    return (
      <button disabled className={className ?? "btn-outline w-full"}>
        Uitverkocht
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        className={className ?? "btn-gold flex-1"}
        onClick={() => {
          add(item, 1);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
      >
        {added ? "Toegevoegd ✓" : item.isPreorder ? "Pre-order plaatsen" : "In winkelwagen"}
      </button>
      <button
        className="btn-primary flex-1"
        onClick={() => {
          add(item, 1);
          router.push("/cart");
        }}
      >
        Direct afrekenen
      </button>
    </div>
  );
}
