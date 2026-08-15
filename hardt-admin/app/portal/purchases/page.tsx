"use client";

import {
  ChevronRight,
  LoaderCircle,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";

import Link from "next/link";

import { useEffect, useState } from "react";

import { getStorePurchases } from "@/lib/api/client-store";

import type { StorePurchase } from "@/lib/api/client-store";

function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setPurchases(await getStorePurchases());
      } catch {
        setError("Não foi possível carregar suas compras.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle size={30} className="animate-spin text-violet-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
          Hardt Store
        </p>

        <h1 className="mt-2 text-3xl font-black text-white">Minhas Compras</h1>

        <p className="mt-2 text-sm text-white/40">
          Consulte seus produtos adquiridos e os dados de entrega.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] py-20 text-center">
          <ShoppingBag size={36} className="mx-auto text-white/20" />

          <p className="mt-5 font-bold text-white/65">
            Você ainda não realizou nenhuma compra.
          </p>

          <Link
            href="/portal/store"
            className="mt-4 inline-flex text-sm font-bold text-violet-300"
          >
            Ir para a Loja
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => (
            <Link
              key={purchase.id}
              href={`/portal/purchases/${purchase.id}`}
              className="group flex items-center justify-between gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-5 transition hover:border-violet-400/20 hover:bg-white/[0.045]"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                  <PackageCheck size={21} />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {purchase.product_name}
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    {purchase.quantity}{" "}
                    {purchase.quantity === 1 ? "unidade" : "unidades"}
                    {" · "}
                    {formatDate(purchase.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-black text-white">
                    {formatMoney(purchase.amount_brl)}
                  </p>

                  <p
                    className={
                      purchase.delivery_type === "service"
                        ? "mt-1 text-xs text-violet-300"
                        : "mt-1 text-xs text-emerald-300"
                    }
                  >
                    {purchase.delivery_type === "service"
                      ? purchase.status === "completed"
                        ? "Concluído"
                        : "Pedido SMM · Processando"
                      : "Concluída"}
                  </p>
                </div>

                <ChevronRight
                  size={18}
                  className="text-white/20 transition group-hover:translate-x-1 group-hover:text-violet-300"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
