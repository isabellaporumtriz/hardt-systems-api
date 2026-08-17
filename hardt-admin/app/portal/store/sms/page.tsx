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
    <div className="space-y-8">
      <Link
        href="/portal/store"
        className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
      >
        <ArrowLeft
          size={16}
        />
        Voltar para a Loja
      </Link>


      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <MessageSquare
                size={23}
              />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
                HardtSMS
              </p>

              <h1 className="mt-1 text-3xl font-black text-white">
                Receba códigos SMS
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/40">
            Escolha o serviço,
            consulte a
            disponibilidade e
            receba o código em um
            único painel.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-5 py-4">
          <WalletCards
            size={20}
            className="text-violet-300"
          />

          <div>
            <p className="text-xs text-white/35">
              Saldo disponível
            </p>

            <p className="mt-1 text-lg font-black text-white">
              {money(
                balance,
              )}
            </p>
          </div>
        </div>
      </div>


      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertCircle
            size={18}
          />
          {error}
        </div>
      )}


      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          <CheckCircle2
            size={18}
          />
          {success}
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
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar WhatsApp, Instagram, Nubank..."
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-400/30"
            />
          </div>


          {!search &&
            featuredServices.length >
              0 && (
              <>
                <div className="mt-7">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
                    Mais procurados
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {featuredServices.map(
                    (service) => (
                      <button
                        type="button"
                        key={
                          service.code
                        }
                        disabled={
                          selecting ===
                          service.code
                        }
                        onClick={() =>
                          void chooseService(
                            service,
                          )
                        }
                        className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-4 text-left transition hover:border-violet-400/35 hover:bg-violet-500/[0.09] disabled:opacity-40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-black text-white">
                            {
                              service.name
                            }
                          </p>

                          {selecting ===
                            service.code && (
                            <LoaderCircle
                              size={15}
                              className="animate-spin text-violet-300"
                            />
                          )}
                        </div>

                        <p className="mt-3 text-xs text-white/35">
                          {service.available_count.toLocaleString(
                            "pt-BR",
                          )}{" "}
                          números
                        </p>

                        <p className="mt-2 text-lg font-black text-violet-200">
                          {money(
                            service.price_brl,
                          )}
                        </p>
                      </button>
                    ),
                  )}
                </div>
              </>
            )}


          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                {search
                  ? "Resultado da busca"
                  : "Outros serviços"}
              </p>

              <p className="mt-2 text-sm text-white/25">
                {
                  visibleServices.length
                }{" "}
                disponíveis
              </p>
            </div>
          </div>


          <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {visibleServices.map(
              (service) => (
                <button
                  type="button"
                  key={
                    service.code
                  }
                  disabled={
                    selecting ===
                    service.code
                  }
                  onClick={() =>
                    void chooseService(
                      service,
                    )
                  }
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-5 rounded-2xl border border-white/[0.06] bg-black/10 px-5 py-4 text-left transition hover:border-violet-400/20 hover:bg-white/[0.025] disabled:opacity-40"
                >
                  <div>
                    <p className="font-bold text-white">
                      {
                        service.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      {service.available_count.toLocaleString(
                        "pt-BR",
                      )}{" "}
                      números disponíveis
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-violet-200">
                      {money(
                        service.price_brl,
                      )}
                    </p>

                    {selecting ===
                      service.code && (
                      <LoaderCircle
                        size={14}
                        className="ml-auto mt-2 animate-spin text-violet-300"
                      />
                    )}
                  </div>
                </button>
              ),
            )}

            {visibleServices.length ===
              0 && (
              <div className="py-12 text-center text-sm text-white/30">
                Nenhum serviço
                encontrado.
              </div>
            )}
          </div>
        </section>


        <aside className="h-fit rounded-[28px] border border-violet-400/15 bg-violet-500/[0.045] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
            Resumo da ativação
          </p>

          {selectedService &&
          quote ? (
            <>
              <h2 className="mt-5 text-2xl font-black text-white">
                {
                  quote.service_name
                }
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-6">
                <div>
                  <p className="text-xs text-white/30">
                    Disponibilidade
                  </p>

                  <p className="mt-1 font-bold text-white">
                    {quote.available_count.toLocaleString(
                      "pt-BR",
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/30">
                    Status
                  </p>

                  <p className="mt-1 font-bold text-emerald-300">
                    {quote.available
                      ? "Disponível"
                      : "Indisponível"}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs text-white/30">
                  Valor final
                </p>

                <p className="mt-2 text-4xl font-black text-white">
                  {money(
                    quote.price_brl,
                  )}
                </p>
              </div>

              <p className="mt-5 text-xs leading-5 text-white/35">
                O valor será
                debitado da sua
                carteira Hardt ao
                confirmar a compra.
              </p>

              <button
                type="button"
                onClick={() =>
                  void handlePurchase()
                }
                disabled={
                  purchasing ||
                  !quote.available ||
                  balance <
                    Number(
                      quote.price_brl,
                    )
                }
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
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
            <div className="py-16 text-center">
              <MessageSquare
                size={30}
                className="mx-auto text-white/15"
              />

              <p className="mt-4 text-sm leading-6 text-white/30">
                Escolha um serviço
                para ver
                disponibilidade e
                preço.
              </p>
            </div>
          )}
        </aside>
      </div>


      {currentActivation && (
        <section className="rounded-[28px] border border-violet-400/15 bg-violet-500/[0.035] p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
                Ativação atual
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                {services.find(
                  (service) =>
                    service.code ===
                    currentActivation.service_code,
                )?.name ??
                  "Ativação SMS"}
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


          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
              <p className="text-xs text-white/30">
                Número
              </p>

              <div className="mt-2 flex items-center gap-3">
                <Phone
                  size={18}
                  className="text-violet-300"
                />

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
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-300"
                >
                  <Copy
                    size={14}
                  />
                  Copiar número
                </button>
              )}
            </div>


            <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
              <p className="text-xs text-white/30">
                Código SMS
              </p>

              <p className="mt-2 text-2xl font-black tracking-[0.12em] text-white">
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
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-300"
                >
                  <Copy
                    size={14}
                  />
                  Copiar código
                </button>
              )}
            </div>


            <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
              <p className="text-xs text-white/30">
                Valor
              </p>

              <p className="mt-2 text-xl font-black text-white">
                {money(
                  currentActivation.customer_price,
                )}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
                <Clock3
                  size={14}
                />

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
            <div className="mt-5 flex flex-wrap gap-3">
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-5 text-sm font-bold text-violet-200 disabled:opacity-40"
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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-500/[0.07] px-5 text-sm font-bold text-red-300 disabled:opacity-40"
                  >
                    <XCircle
                      size={16}
                    />
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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.07] px-5 text-sm font-bold text-emerald-300 disabled:opacity-40"
                  >
                    <CheckCircle2
                      size={16}
                    />
                    Finalizar
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}


      <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
          Histórico
        </p>

        <h2 className="mt-2 text-xl font-black text-white">
          Minhas ativações
        </h2>

        {activations.length ===
        0 ? (
          <div className="py-14 text-center text-sm text-white/30">
            Nenhuma ativação
            realizada ainda.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {activations.map(
              (activation) => (
                <button
                  type="button"
                  key={
                    activation.id
                  }
                  onClick={() =>
                    setCurrentActivation(
                      activation,
                    )
                  }
                  className="grid w-full gap-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-left transition hover:border-violet-400/20 md:grid-cols-[1fr_1fr_150px_150px]"
                >
                  <div>
                    <p className="text-xs text-white/30">
                      Serviço
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {services.find(
                        (service) =>
                          service.code ===
                          activation.service_code,
                      )?.name ??
                        "SMS"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/30">
                      Número
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {activation.phone_number ??
                        "Aguardando"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/30">
                      Valor
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {money(
                        activation.customer_price,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/30">
                      Status
                    </p>

                    <p className="mt-1 text-xs font-bold text-violet-300">
                      {statusLabel(
                        activation.status,
                      )}
                    </p>
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
