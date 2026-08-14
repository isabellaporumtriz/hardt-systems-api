"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  KeyRound,
  LoaderCircle,
  PackageCheck,
} from "lucide-react";

import Link from "next/link";

import { useParams } from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

import {
  downloadPurchaseCsv,
  getPurchaseDelivery,
} from "@/lib/api/client-store";

import type {
  PurchaseDelivery,
} from "@/lib/api/client-store";

const fieldLabels: Record<string, string> = {
  login: "Login",
  password: "Senha",
  email: "E-mail",
  email_password: "Senha do e-mail",
  two_factor: "2FA",
  cookies: "Cookies",
  notes: "Observações",
};

export default function PurchaseDeliveryPage() {
  const params = useParams();

  const purchaseId =
    String(params.id);

  const [delivery, setDelivery] =
    useState<PurchaseDelivery | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [downloading, setDownloading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setDelivery(
          await getPurchaseDelivery(
            purchaseId
          )
        );
      } catch {
        setError(
          "Não foi possível carregar os dados desta compra."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [purchaseId]);

  async function copy(
    key: string,
    value: unknown
  ) {
    const normalized =
      typeof value === "string"
        ? value
        : JSON.stringify(value);

    await navigator.clipboard.writeText(
      normalized
    );

    setCopied(key);

    window.setTimeout(
      () => setCopied(null),
      1600
    );
  }

  async function downloadCsv() {
    try {
      setDownloading(true);
      setError("");

      await downloadPurchaseCsv(
        purchaseId
      );
    } catch {
      setError(
        "Não foi possível baixar o CSV."
      );
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle
          size={30}
          className="animate-spin text-violet-300"
        />
      </div>
    );
  }

  if (
    error
    && !delivery
  ) {
    return (
      <div className="space-y-5">
        <Link
          href="/portal/purchases"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white"
        >
          <ArrowLeft size={16} />
          Minhas Compras
        </Link>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!delivery) {
    return null;
  }

  return (
    <div className="space-y-8">
      <Link
        href="/portal/purchases"
        className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Minhas Compras
      </Link>

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
            <PackageCheck size={23} />
          </div>

          <h1 className="mt-5 text-3xl font-black text-white">
            {delivery.product_name}
          </h1>

          <p className="mt-2 text-sm text-white/40">
            {delivery.quantity}{" "}
            {delivery.quantity === 1
              ? "unidade adquirida"
              : "unidades adquiridas"}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void downloadCsv()
          }
          disabled={downloading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Download size={18} />
          )}

          {downloading
            ? "Baixando..."
            : "Baixar CSV"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {delivery.items.map(
          (item, itemIndex) => (
            <div
              key={
                item.inventory_item_id
                || itemIndex
              }
              className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025]"
            >
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-5">
                <KeyRound
                  size={20}
                  className="text-violet-300"
                />

                <div>
                  <p className="font-bold text-white">
                    Acesso{" "}
                    {itemIndex + 1}
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Dados desta unidade.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {Object.entries(
                  item.payload
                ).map(
                  ([key, value]) => {
                    const normalized =
                      typeof value
                        === "string"
                        ? value
                        : JSON.stringify(
                            value
                          );

                    const copyKey =
                      `${itemIndex}-${key}`;

                    return (
                      <div
                        key={key}
                        className="grid gap-3 px-6 py-5 md:grid-cols-[180px_1fr_auto] md:items-center"
                      >
                        <p className="text-sm font-semibold text-white/40">
                          {fieldLabels[key]
                            || key}
                        </p>

                        <p className="break-all font-mono text-sm text-white/80">
                          {normalized || "—"}
                        </p>

                        {normalized && (
                          <button
                            type="button"
                            onClick={() =>
                              void copy(
                                copyKey,
                                value
                              )
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 text-xs font-bold text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                          >
                            {copied
                              === copyKey ? (
                              <>
                                <Check
                                  size={14}
                                />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy
                                  size={14}
                                />
                                Copiar
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
