import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-sm text-navy/50 hover:text-gold-dark">
        ← Producten
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Nieuw product</h1>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
