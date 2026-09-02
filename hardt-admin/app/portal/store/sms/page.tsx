"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  LoaderCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  WalletCards,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  cancelSMSActivation,
  finishSMSActivation,
  getSMSCatalog,
  getSMSQuote,
  listSMSActivations,
  purchaseSMSActivation,
  syncSMSActivation,
} from "@/lib/api/client-sms";

import type {
  SMSActivation,
  SMSQuote,
  SMSService,
} from "@/lib/api/client-sms";

import { getWallet } from "@/lib/api/client-wallet";


const FEATURED_CODES = [
  "wa",
  "tg",
  "ig",
  "fb",
  "go",
  "dr",
];


function money(
  value: string | number,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(
    Number(value),
  );
}


function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}


function statusLabel(
  status: string,
): string {
  const labels: Record<
    string,
    string
  > = {
    submitting:
      "Enviando",

    submission_unknown:
      "Aguardando reconciliação",

    waiting:
      "Aguardando SMS",

    waiting_code:
      "Aguardando SMS",

    code_received:
      "Código recebido",

    received:
      "Código recebido",

    finished:
      "Finalizada",

    cancelled:
      "Cancelada",

    expired:
      "Expirada",

    failed:
      "Falhou",
  };

  return (
    labels[status] ??
    status.replaceAll(
      "_",
      " ",
    )
  );
}


function isTerminal(
  status: string,
): boolean {
  return [
    "finished",
    "cancelled",
    "expired",
    "failed",
  ].includes(status);
}


function statusClasses(
  status: string,
): string {
  if (
    [
      "finished",
      "code_received",
      "received",
    ].includes(status)
  ) {
    return (
      "border-emerald-400/15 " +
      "bg-emerald-400/[0.07] " +
      "text-emerald-300"
    );
  }

  if (
    [
      "failed",
      "expired",
      "cancelled",
    ].includes(status)
  ) {
    return (
      "border-red-400/15 " +
      "bg-red-400/[0.07] " +
      "text-red-300"
    );
  }

  if (
    status ===
    "submission_unknown"
  ) {
    return (
      "border-amber-400/15 " +
      "bg-amber-400/[0.07] " +
      "text-amber-300"
    );
  }

  return (
    "border-violet-400/15 " +
    "bg-violet-400/[0.07] " +
    "text-violet-300"
  );
}


export default function SMSPage() {
  const [
    services,
    setServices,
  ] = useState<SMSService[]>(
    [],
  );

  const [
    activations,
    setActivations,
  ] = useState<
    SMSActivation[]
  >([]);

  const [
    currentActivation,
    setCurrentActivation,
  ] =
    useState<SMSActivation | null>(
      null,
    );

  const [
    selectedService,
    setSelectedService,
  ] =
    useState<SMSService | null>(
      null,
    );

  const [
    quote,
    setQuote,
  ] =
    useState<SMSQuote | null>(
      null,
    );

  const [
    balance,
    setBalance,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    selecting,
    setSelecting,
  ] =
    useState<string | null>(
      null,
    );

  const [
    purchasing,
    setPurchasing,
  ] = useState(false);

  const [
    busyActivationId,
    setBusyActivationId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const purchaseKey =
    useRef<string | null>(
      null,
    );


  async function refreshAccount() {
    const [
      wallet,
      history,
    ] = await Promise.all([
      getWallet(),
      listSMSActivations(),
    ]);

    setBalance(
      Number(
        wallet.balance,
      ),
    );

    setActivations(
      history,
    );

    setCurrentActivation(
      (current) => {
        if (current) {
          return (
            history.find(
              (item) =>
                item.id ===
                current.id,
            ) ??
            current
          );
        }

        return (
          history.find(
            (item) =>
              !isTerminal(
                item.status,
              ),
          ) ??
          history[0] ??
          null
        );
      },
    );
  }


  useEffect(() => {
    async function load() {
      try {
        setError("");

        const [
          catalog,
          wallet,
          history,
        ] =
          await Promise.all([
            getSMSCatalog(73),
            getWallet(),
            listSMSActivations(),
          ]);

        setServices(
          catalog,
        );

        setBalance(
          Number(
            wallet.balance,
          ),
        );

        setActivations(
          history,
        );

        setCurrentActivation(
          history.find(
            (item) =>
              !isTerminal(
                item.status,
              ),
          ) ??
            history[0] ??
            null,
        );
      } catch {
        setError(
          "Não foi possível carregar o HardtSMS.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    void load();
  }, []);


  const featuredServices =
    useMemo(
      () =>
        FEATURED_CODES
          .map(
            (code) =>
              services.find(
                (service) =>
                  service.code ===
                  code,
              ),
          )
          .filter(
            (
              service,
            ): service is SMSService =>
              Boolean(service),
          ),
      [services],
    );


  const visibleServices =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLocaleLowerCase(
            "pt-BR",
          );

      return services.filter(
        (service) => {
          if (
            FEATURED_CODES.includes(
              service.code,
            ) &&
            !term
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          return service.name
            .toLocaleLowerCase(
              "pt-BR",
            )
            .includes(term);
        },
      );
    }, [
      services,
      search,
    ]);


  async function chooseService(
    service: SMSService,
  ) {
    try {
      setError("");
      setSuccess("");
      setSelecting(
        service.code,
      );

      const freshQuote =
        await getSMSQuote(
          service.code,
          73,
        );

      setSelectedService(
        service,
      );

      setQuote(
        freshQuote,
      );

      purchaseKey.current =
        null;
    } catch (
      requestError: any
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.detail ||
          "Não foi possível consultar este serviço.",
      );
    } finally {
      setSelecting(
        null,
      );
    }
  }


  async function handlePurchase() {
    if (
      !selectedService ||
      !quote
    ) {
      return;
    }

    if (
      !quote.available
    ) {
      setError(
        "Não há números disponíveis para este serviço.",
      );
      return;
    }

    if (
      balance <
      Number(
        quote.price_brl,
      )
    ) {
      setError(
        "Saldo insuficiente. Adicione saldo à sua carteira Hardt.",
      );
      return;
    }

    if (
      !purchaseKey.current
    ) {
      purchaseKey.current =
        `sms-${selectedService.code}-${crypto.randomUUID()}`;
    }

    try {
      setError("");
      setSuccess("");
      setPurchasing(
        true,
      );

      const activation =
        await purchaseSMSActivation(
          {
            country: 73,

            service_code:
              selectedService.code,

            idempotency_key:
              purchaseKey.current,
          },
        );

      setCurrentActivation(
        activation,
      );

      if (
        ![
          "submitting",
          "submission_unknown",
        ].includes(
          activation.status,
        )
      ) {
        purchaseKey.current =
          null;
      }

      await refreshAccount();

      if (
        activation.status ===
        "submission_unknown"
      ) {
        setSuccess(
          "Solicitação registrada. Aguarde a reconciliação antes de tentar novamente.",
        );
      } else {
        setSuccess(
          "Número adquirido com sucesso.",
        );
      }
    } catch (
      requestError: any
    ) {
      const status =
        requestError
          ?.response
          ?.status;

      const detail =
        requestError
          ?.response
          ?.data
          ?.detail;

      if (
        status === 502
      ) {
        purchaseKey.current =
          null;
      }

      setError(
        typeof detail ===
          "string"
          ? detail
          : "Não foi possível concluir a solicitação.",
      );
    } finally {
      setPurchasing(
        false,
      );
    }
  }


  async function handleSync(
    activation:
      SMSActivation,
  ) {
    try {
      setError("");
      setSuccess("");
      setBusyActivationId(
        activation.id,
      );

      const updated =
        await syncSMSActivation(
          activation.id,
        );

      setCurrentActivation(
        updated,
      );

      await refreshAccount();

      if (
        updated.sms_code
      ) {
        setSuccess(
          `Código recebido: ${updated.sms_code}`,
        );
      }
    } catch (
      requestError: any
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.detail ||
          "Não foi possível atualizar a ativação.",
      );
    } finally {
      setBusyActivationId(
        null,
      );
    }
  }


  async function handleCancel(
    activation:
      SMSActivation,
  ) {
    try {
      setError("");
      setSuccess("");
      setBusyActivationId(
        activation.id,
      );

      const updated =
        await cancelSMSActivation(
          activation.id,
        );

      setCurrentActivation(
        updated,
      );

      await refreshAccount();

      setSuccess(
        "Ativação cancelada. O estorno foi processado na carteira Hardt.",
      );
    } catch (
      requestError: any
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.detail ||
          "Não foi possível cancelar a ativação.",
      );
    } finally {
      setBusyActivationId(
        null,
      );
    }
  }


  async function handleFinish(
    activation:
      SMSActivation,
  ) {
    try {
      setError("");
      setSuccess("");
      setBusyActivationId(
        activation.id,
      );

      const updated =
        await finishSMSActivation(
          activation.id,
        );

      setCurrentActivation(
        updated,
      );

      await refreshAccount();

      setSuccess(
        "Ativação finalizada.",
      );
    } catch (
      requestError: any
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.detail ||
          "Não foi possível finalizar a ativação.",
      );
    } finally {
      setBusyActivationId(
        null,
      );
    }
  }


  async function copyText(
    value: string,
  ) {
    await navigator
      .clipboard
      .writeText(value);

    setSuccess(
      "Copiado.",
    );
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


  return (
    <div className="space-y-6 pb-10">
      <Link
        href="/portal/store"
        className="inline-flex items-center gap-2 text-sm font-medium text-white/40 transition hover:text-violet-200"
      >
        <ArrowLeft size={16} />
        Voltar para a Loja
      </Link>

      {/* ============================================================
          CABEÇALHO
          ============================================================ */}
      <header className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/25 to-violet-950/30 text-violet-200 shadow-[0_0_30px_rgba(124,58,237,0.12)]">
            <MessageSquare size={25} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">
              HardtSMS
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
              Receba códigos SMS
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Números temporários e ativações SMS em um painel rápido,
              seguro e integrado à sua carteira Hardt.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.07] px-3 py-2 text-xs font-bold text-emerald-300">
            <CheckCircle2 size={15} />
            Ativação automatizada
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-violet-400/15 bg-violet-500/[0.07] px-3 py-2 text-xs font-bold text-violet-300">
            <WalletCards size={15} />
            Carteira integrada
          </div>
        </div>
      </header>

      {/* ============================================================
          ALERTAS
          ============================================================ */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ==========================================================
            COLUNA PRINCIPAL
            ========================================================== */}
        <main className="min-w-0 space-y-6">
          {/* SALDO */}
          <section className="relative overflow-hidden rounded-[26px] border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.11] via-white/[0.035] to-transparent p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/15 text-violet-200">
                  <WalletCards size={24} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white/50">
                    Saldo disponível
                  </p>

                  <p className="mt-1 text-3xl font-black tracking-tight text-emerald-300">
                    {money(balance)}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    Utilize seu saldo para comprar números e ativações.
                  </p>
                </div>
              </div>

              <Link
                href="/portal/wallet"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(124,58,237,0.18)] transition hover:bg-violet-500"
              >
                <span className="text-lg leading-none">+</span>
                Adicionar saldo
              </Link>
            </div>
          </section>

          {/* BUSCA + MAIS PROCURADOS */}
          <section className="rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar WhatsApp, Instagram, Nubank..."
                className="h-12 w-full rounded-2xl border border-white/[0.09] bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/40 focus:bg-violet-500/[0.025]"
              />
            </div>

            {!search && featuredServices.length > 0 && (
              <>
                <div className="mt-7 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                      Mais procurados
                    </p>

                    <p className="mt-1 text-sm text-white/35">
                      Selecione um serviço para consultar a ativação.
                    </p>
                  </div>

                  <div className="hidden text-xs font-semibold text-violet-300/70 sm:block">
                    Alta disponibilidade
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {featuredServices.map((service) => {
                    const selected =
                      selectedService?.code === service.code;

                    const visual =
                      {
                        wa: {
                          badge: "WA",
                          badgeClass:
                            "border-emerald-400/20 bg-emerald-500/15 text-emerald-300",
                          priceClass:
                            "bg-emerald-500/15 text-emerald-300",
                          glow:
                            "shadow-[0_0_35px_rgba(16,185,129,0.05)]",
                        },
                        tg: {
                          badge: "TG",
                          badgeClass:
                            "border-sky-400/20 bg-sky-500/15 text-sky-300",
                          priceClass:
                            "bg-sky-500/15 text-sky-300",
                          glow:
                            "shadow-[0_0_35px_rgba(14,165,233,0.05)]",
                        },
                        ig: {
                          badge: "IG",
                          badgeClass:
                            "border-fuchsia-400/20 bg-fuchsia-500/15 text-fuchsia-300",
                          priceClass:
                            "bg-violet-500/20 text-violet-200",
                          glow:
                            "shadow-[0_0_35px_rgba(168,85,247,0.08)]",
                        },
                        fb: {
                          badge: "FB",
                          badgeClass:
                            "border-blue-400/20 bg-blue-500/15 text-blue-300",
                          priceClass:
                            "bg-blue-500/15 text-blue-300",
                          glow:
                            "shadow-[0_0_35px_rgba(59,130,246,0.05)]",
                        },
                        go: {
                          badge: "G",
                          badgeClass:
                            "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
                          priceClass:
                            "bg-emerald-500/15 text-emerald-300",
                          glow:
                            "shadow-[0_0_35px_rgba(34,197,94,0.05)]",
                        },
                        dr: {
                          badge: "AI",
                          badgeClass:
                            "border-teal-400/20 bg-teal-500/15 text-teal-300",
                          priceClass:
                            "bg-emerald-500/15 text-emerald-300",
                          glow:
                            "shadow-[0_0_35px_rgba(20,184,166,0.05)]",
                        },
                      }[service.code] ?? {
                        badge: service.name
                          .slice(0, 2)
                          .toUpperCase(),
                        badgeClass:
                          "border-violet-400/20 bg-violet-500/15 text-violet-300",
                        priceClass:
                          "bg-violet-500/15 text-violet-200",
                        glow: "",
                      };

                    return (
                      <button
                        type="button"
                        key={service.code}
                        disabled={
                          selecting === service.code
                        }
                        onClick={() =>
                          void chooseService(service)
                        }
                        className={[
                          "group relative min-h-[178px] overflow-hidden rounded-2xl border p-5 text-left transition duration-200",
                          selected
                            ? "border-violet-400/75 bg-violet-500/[0.11] ring-1 ring-violet-400/25"
                            : "border-white/[0.08] bg-black/15 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.05]",
                          visual.glow,
                          selecting === service.code
                            ? "opacity-60"
                            : "",
                        ].join(" ")}
                      >
                        {selected && (
                          <div className="absolute right-3 top-3 rounded-full border border-violet-400/25 bg-violet-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">
                            Selecionado
                          </div>
                        )}

                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-black ${visual.badgeClass}`}
                        >
                          {selecting === service.code ? (
                            <LoaderCircle
                              size={18}
                              className="animate-spin"
                            />
                          ) : (
                            visual.badge
                          )}
                        </div>

                        <p className="mt-4 text-base font-black text-white">
                          {service.name}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          {service.available_count.toLocaleString(
                            "pt-BR",
                          )}{" "}
                          números disponíveis
                        </p>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <span
                            className={`rounded-lg px-2.5 py-1.5 text-base font-black ${visual.priceClass}`}
                          >
                            {money(service.price_brl)}
                          </span>

                          <span className="text-xs font-semibold text-emerald-300/80">
                            Alta disponibilidade
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* OUTROS SERVIÇOS */}
            <div className="mt-8 flex items-end justify-between gap-4 border-t border-white/[0.06] pt-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                  {search
                    ? "Resultado da busca"
                    : "Outros serviços disponíveis"}
                </p>

                <p className="mt-1 text-sm text-white/35">
                  {visibleServices.length} serviços
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-[500px] space-y-2 overflow-y-auto pr-1">
              {visibleServices.map((service) => {
                const selected =
                  selectedService?.code === service.code;

                return (
                  <button
                    type="button"
                    key={service.code}
                    disabled={
                      selecting === service.code
                    }
                    onClick={() =>
                      void chooseService(service)
                    }
                    className={[
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border px-5 py-4 text-left transition",
                      selected
                        ? "border-violet-400/40 bg-violet-500/[0.09]"
                        : "border-white/[0.065] bg-black/10 hover:border-violet-400/25 hover:bg-white/[0.035]",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">
                        {service.name}
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        {service.available_count.toLocaleString(
                          "pt-BR",
                        )}{" "}
                        números disponíveis
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="whitespace-nowrap font-black text-emerald-300">
                        {money(service.price_brl)}
                      </p>

                      {selecting === service.code ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin text-violet-300"
                        />
                      ) : (
                        <span className="text-lg text-white/25">
                          ›
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {visibleServices.length === 0 && (
                <div className="py-12 text-center text-sm text-white/30">
                  Nenhum serviço encontrado.
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ==========================================================
            COLUNA LATERAL
            ========================================================== */}
        <aside className="h-fit space-y-4 xl:sticky xl:top-6">
          {/* RESUMO */}
          <section className="rounded-[26px] border border-white/[0.09] bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <MessageSquare size={17} />
              </div>

              <p className="text-sm font-black text-white">
                Resumo da ativação
              </p>
            </div>

            {selectedService && quote ? (
              <>
                <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                    Serviço selecionado
                  </p>

                  <h2 className="mt-2 text-xl font-black text-white">
                    {quote.service_name}
                  </h2>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-xs font-bold",
                        quote.available
                          ? "bg-emerald-500/12 text-emerald-300"
                          : "bg-red-500/12 text-red-300",
                      ].join(" ")}
                    >
                      {quote.available
                        ? "Disponível"
                        : "Indisponível"}
                    </span>

                    <span className="text-xs text-white/35">
                      {quote.available_count.toLocaleString(
                        "pt-BR",
                      )}{" "}
                      números
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs text-white/35">
                    Valor final
                  </p>

                  <p className="mt-1 text-4xl font-black tracking-tight text-emerald-300">
                    {money(quote.price_brl)}
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/15 px-4 py-3 text-xs leading-5 text-white/40">
                  O valor será debitado da sua carteira Hardt
                  apenas ao confirmar a compra.
                </div>

                {balance <
                  Number(quote.price_brl) && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-300">
                    <AlertCircle size={15} />
                    Saldo insuficiente para esta ativação.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void handlePurchase()
                  }
                  disabled={
                    purchasing ||
                    !quote.available ||
                    balance <
                      Number(quote.price_brl)
                  }
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white shadow-[0_12px_35px_rgba(124,58,237,0.2)] transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {purchasing && (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {purchasing
                    ? "Comprando..."
                    : "Comprar número"}
                </button>
              </>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-violet-400/40 bg-violet-500/[0.05] text-violet-300">
                  <Phone size={25} />
                </div>

                <p className="mt-5 font-bold text-white">
                  Selecione um serviço
                </p>

                <p className="mx-auto mt-2 max-w-[240px] text-sm leading-6 text-white/35">
                  Escolha um serviço para consultar disponibilidade,
                  valor e iniciar sua ativação.
                </p>
              </div>
            )}
          </section>

          {/* BENEFÍCIOS / HIERARQUIA VISUAL */}
          <section className="rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-6">
            <p className="text-sm font-black text-white">
              Por que escolher HardtSMS?
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 size={17} />
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    Entrega automatizada
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Número entregue diretamente no painel
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <WalletCards size={17} />
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    Carteira unificada
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Pagamento pelo saldo da sua conta Hardt
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
                  <Clock3 size={17} />
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    Acompanhamento em tempo real
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Consulte o status e o código na mesma tela
                  </p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* ============================================================
          ATIVAÇÃO ATUAL
          ============================================================ */}
      {currentActivation && (
        <section className="overflow-hidden rounded-[28px] border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.025] to-transparent">
          <div className="flex flex-col justify-between gap-5 border-b border-white/[0.06] px-6 py-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                Ativação atual
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                {services.find(
                  (service) =>
                    service.code ===
                    currentActivation.service_code,
                )?.name ?? "Ativação SMS"}
              </h2>
            </div>

            <span
              className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClasses(
                currentActivation.status,
              )}`}
            >
              {statusLabel(
                currentActivation.status,
              )}
            </span>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Número
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                  <Phone size={17} />
                </div>

                <p className="break-all text-lg font-black text-white">
                  {currentActivation.phone_number ??
                    "Aguardando..."}
                </p>
              </div>

              {currentActivation.phone_number && (
                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      currentActivation.phone_number!,
                    )
                  }
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-300 transition hover:text-violet-200"
                >
                  <Copy size={14} />
                  Copiar número
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Código SMS
              </p>

              <p
                className={[
                  "mt-3 text-3xl font-black tracking-[0.14em]",
                  currentActivation.sms_code
                    ? "text-emerald-300"
                    : "text-white/35",
                ].join(" ")}
              >
                {currentActivation.sms_code ??
                  "—"}
              </p>

              {currentActivation.sms_code && (
                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      currentActivation.sms_code!,
                    )
                  }
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-300 transition hover:text-emerald-200"
                >
                  <Copy size={14} />
                  Copiar código
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Valor
              </p>

              <p className="mt-3 text-2xl font-black text-emerald-300">
                {money(
                  currentActivation.customer_price,
                )}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-white/35">
                <Clock3 size={14} />

                {currentActivation.expires_at
                  ? `Expira ${formatDate(
                      currentActivation.expires_at,
                    )}`
                  : statusLabel(
                      currentActivation.status,
                    )}
              </div>
            </div>
          </div>

          {!isTerminal(
            currentActivation.status,
          ) && (
            <div className="flex flex-wrap gap-3 border-t border-white/[0.06] px-6 py-5">
              <button
                type="button"
                disabled={
                  busyActivationId ===
                  currentActivation.id
                }
                onClick={() =>
                  void handleSync(
                    currentActivation,
                  )
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-5 text-sm font-bold text-violet-200 transition hover:bg-violet-500/15 disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={
                    busyActivationId ===
                    currentActivation.id
                      ? "animate-spin"
                      : ""
                  }
                />
                Atualizar SMS
              </button>

              {![
                "submitting",
                "submission_unknown",
              ].includes(
                currentActivation.status,
              ) && (
                <>
                  <button
                    type="button"
                    disabled={
                      busyActivationId ===
                      currentActivation.id
                    }
                    onClick={() =>
                      void handleCancel(
                        currentActivation,
                      )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-500/[0.07] px-5 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <XCircle size={16} />
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={
                      busyActivationId ===
                      currentActivation.id
                    }
                    onClick={() =>
                      void handleFinish(
                        currentActivation,
                      )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.07] px-5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    <CheckCircle2 size={16} />
                    Finalizar
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* ============================================================
          HISTÓRICO
          ============================================================ */}
      <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
              Histórico
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Minhas ativações
            </h2>
          </div>

          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/40">
            {activations.length}
          </span>
        </div>

        {activations.length === 0 ? (
          <div className="py-14 text-center text-sm text-white/30">
            Nenhuma ativação realizada ainda.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
            {activations.map(
              (activation, index) => (
                <button
                  type="button"
                  key={activation.id}
                  onClick={() =>
                    setCurrentActivation(
                      activation,
                    )
                  }
                  className={[
                    "grid w-full gap-4 bg-black/10 p-4 text-left transition hover:bg-violet-500/[0.045] md:grid-cols-[1fr_1fr_140px_140px]",
                    index > 0
                      ? "border-t border-white/[0.06]"
                      : "",
                  ].join(" ")}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                      Serviço
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {services.find(
                        (service) =>
                          service.code ===
                          activation.service_code,
                      )?.name ?? "SMS"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                      Número
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {activation.phone_number ??
                        "Aguardando"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                      Valor
                    </p>

                    <p className="mt-1 font-black text-emerald-300">
                      {money(
                        activation.customer_price,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                      Status
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClasses(
                        activation.status,
                      )}`}
                    >
                      {statusLabel(
                        activation.status,
                      )}
                    </span>
                  </div>
                </button>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
