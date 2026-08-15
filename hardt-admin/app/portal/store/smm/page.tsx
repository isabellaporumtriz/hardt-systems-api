"use client";

import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  LoaderCircle,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  createSMMQuote,
  getSMMCatalog,
  purchaseSMM,
} from "@/lib/api/client-smm";

import type { SMMQuote, SMMService } from "@/lib/api/client-smm";

import { getWallet } from "@/lib/api/client-wallet";

function money(value: string | number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default function SMMPage() {
  const [services, setServices] = useState<SMMService[]>([]);

  const [balance, setBalance] = useState(0);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("");

  const [serviceId, setServiceId] = useState("");

  const [quantity, setQuantity] = useState(1000);

  const [targetUrl, setTargetUrl] = useState("");

  const [quote, setQuote] = useState<SMMQuote | null>(null);

  const [quoting, setQuoting] = useState(false);

  const [purchasing, setPurchasing] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [catalog, wallet] = await Promise.all([
          getSMMCatalog(),
          getWallet(),
        ]);

        setServices(catalog);

        setBalance(Number(wallet.balance));
      } catch {
        setError("Não foi possível carregar o catálogo SMM.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(services.map((item) => item.category).filter(Boolean)),
      ).sort(),
    [services],
  );

  const visibleServices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return services.filter((service) => {
      if (category && service.category !== category) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        service.name.toLowerCase().includes(term) ||
        service.category.toLowerCase().includes(term)
      );
    });
  }, [services, search, category]);

  const selectedService = useMemo(
    () =>
      services.find(
        (service) => String(service.provider_service_id) === serviceId,
      ) ?? null,
    [services, serviceId],
  );

  useEffect(() => {
    setQuote(null);
  }, [serviceId, quantity, targetUrl]);

  async function handlePurchase() {
    if (!quote || !selectedService) {
      setError("Calcule o preço antes de comprar.");
      return;
    }

    if (!targetUrl.trim()) {
      setError("Informe o link de destino.");
      return;
    }

    const amount = Number(quote.amount_brl);

    if (balance < amount) {
      setError("Saldo insuficiente para esta compra.");
      return;
    }

    try {
      setError("");
      setPurchasing(true);

      await purchaseSMM({
        service_id: selectedService.provider_service_id,
        quantity,
        target_url: targetUrl.trim(),
        idempotency_key: crypto.randomUUID(),
      });

      const wallet = await getWallet();

      setBalance(Number(wallet.balance));

      alert("Pedido SMM registrado com sucesso na Hardt.");

      setQuote(null);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.detail ||
          "Não foi possível registrar a compra.",
      );
    } finally {
      setPurchasing(false);
    }
  }

  async function calculateQuote() {
    if (!selectedService) {
      setError("Selecione um serviço.");
      return;
    }

    if (
      quantity < selectedService.min_quantity ||
      quantity > selectedService.max_quantity
    ) {
      setError(
        `Quantidade permitida: ${selectedService.min_quantity} a ${selectedService.max_quantity}.`,
      );
      return;
    }

    try {
      setError("");
      setQuoting(true);

      const result = await createSMMQuote(
        selectedService.provider_service_id,
        quantity,
        targetUrl.trim(),
      );

      setQuote(result);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.detail ||
          "Não foi possível calcular o preço.",
      );
    } finally {
      setQuoting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle size={30} className="animate-spin text-violet-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/portal/store"
        className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Voltar para a Loja
      </Link>

      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <Sparkles size={23} />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
                Hardt SMM
              </p>

              <h1 className="mt-1 text-3xl font-black text-white">
                Social Media Services
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/40">
            Consulte nosso catálogo conectado e veja o valor final antes da
            compra.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-5 py-4">
          <WalletCards size={20} className="text-violet-300" />

          <div>
            <p className="text-xs text-white/35">Saldo disponível</p>

            <p className="mt-1 text-lg font-black text-white">
              {money(balance)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar serviço..."
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-400/30"
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold text-white/35">
                Categoria
              </span>

              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setServiceId("");
                }}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-[#111019] px-4 text-sm text-white outline-none"
              >
                <option value="">Todas as categorias</option>

                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold text-white/35">
                Serviço
              </span>

              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-[#111019] px-4 text-sm text-white outline-none"
              >
                <option value="">Selecione um serviço</option>

                {visibleServices.map((service) => (
                  <option
                    key={service.provider_service_id}
                    value={service.provider_service_id}
                  >
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedService && (
            <div className="mt-5 grid gap-4 rounded-2xl border border-white/[0.06] bg-black/10 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-white/30">Mínimo</p>
                <p className="mt-1 font-bold text-white">
                  {selectedService.min_quantity}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/30">Máximo</p>
                <p className="mt-1 font-bold text-white">
                  {selectedService.max_quantity}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/30">Refill</p>
                <p className="mt-1 font-bold text-white">
                  {selectedService.refill ? "Sim" : "Não"}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/30">Tipo</p>
                <p className="mt-1 font-bold text-white">
                  {selectedService.service_type}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold text-white/35">
                Quantidade
              </span>

              <input
                type="number"
                value={quantity}
                min={selectedService?.min_quantity ?? 1}
                max={selectedService?.max_quantity}
                onChange={(event) =>
                  setQuantity(
                    Math.max(1, Math.floor(Number(event.target.value) || 1)),
                  )
                }
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold text-white/35">Link</span>

              <div className="relative">
                <ExternalLink
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                />

                <input
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20"
                />
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void calculateQuote()}
            disabled={quoting || !selectedService}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 font-bold text-violet-200 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {quoting && <LoaderCircle size={18} className="animate-spin" />}

            {quoting ? "Calculando..." : "Calcular preço"}
          </button>
        </section>

        <aside className="h-fit rounded-[28px] border border-violet-400/15 bg-violet-500/[0.045] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
            Resumo do pedido
          </p>

          {quote ? (
            <>
              <p className="mt-5 text-sm leading-6 text-white/55">
                {quote.service_name}
              </p>

              <div className="mt-6 border-t border-white/[0.07] pt-6">
                <p className="text-xs text-white/30">Quantidade</p>

                <p className="mt-1 font-bold text-white">
                  {quote.quantity.toLocaleString("pt-BR")}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-xs text-white/30">Valor final</p>

                <p className="mt-2 text-4xl font-black text-white">
                  {money(quote.amount_brl)}
                </p>
              </div>

              <div className="mt-7 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-300">
                  Pronto para comprar
                </p>

                <p className="mt-2 text-xs leading-5 text-white/40">
                  O valor será debitado da sua carteira Hardt ao confirmar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handlePurchase()}
                disabled={purchasing || balance < Number(quote.amount_brl)}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-violet-600 font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {purchasing ? "Registrando..." : "Comprar serviço"}
              </button>
            </>
          ) : (
            <div className="py-16 text-center">
              <Sparkles size={30} className="mx-auto text-white/15" />

              <p className="mt-4 text-sm text-white/30">
                Selecione um serviço e calcule o preço.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
