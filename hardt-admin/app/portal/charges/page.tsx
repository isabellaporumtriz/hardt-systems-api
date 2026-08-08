"use client";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getClientCharges } from "@/lib/api/client-charges";

import type {
  ClientChargeItem,
  ClientChargeListResponse,
  ClientChargeStatus,
} from "@/lib/types/client-charges";

const PAGE_SIZE = 10;

type ChargeFilter =
  | ""
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";

const STATUS_FILTERS: Array<{
  label: string;
  value: ChargeFilter;
}> = [
  {
    label: "Todas",
    value: "",
  },
  {
    label: "Pendentes",
    value: "pending",
  },
  {
    label: "Pagas",
    value: "paid",
  },
  {
    label: "Vencidas",
    value: "overdue",
  },
  {
    label: "Canceladas",
    value: "cancelled",
  },
  {
    label: "Estornadas",
    value: "refunded",
  },
];

function formatCurrency(value: string | number): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getPaymentMethodLabel(
  paymentMethod: string | null,
): string {
  if (!paymentMethod) {
    return "Não informado";
  }

  const normalized = paymentMethod.toLowerCase();

  if (normalized === "pix") {
    return "PIX";
  }

  if (
    normalized === "credit_card"
    || normalized === "card"
  ) {
    return "Cartão";
  }

  if (normalized === "boleto") {
    return "Boleto";
  }

  return paymentMethod;
}

function getStatusLabel(
  status: string,
): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Paga",
    overdue: "Vencida",
    cancelled: "Cancelada",
    refunded: "Estornada",
  };

  return labels[status] ?? status;
}

function getStatusClasses(
  status: string,
): string {
  const classes: Record<string, string> = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-700",
    paid:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    overdue:
      "border-red-200 bg-red-50 text-red-700",
    cancelled:
      "border-zinc-200 bg-zinc-100 text-zinc-600",
    refunded:
      "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    classes[status]
    ?? "border-zinc-200 bg-zinc-100 text-zinc-600"
  );
}

function getStatusIcon(
  status: string,
) {
  if (status === "paid") {
    return CheckCircle2;
  }

  if (status === "overdue") {
    return CircleAlert;
  }

  if (status === "cancelled") {
    return XCircle;
  }

  if (status === "refunded") {
    return RotateCcw;
  }

  return Clock3;
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error === "object"
    && error !== null
    && "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string;
          };
        };
      }
    ).response;

    if (response?.data?.detail) {
      return response.data.detail;
    }
  }

  return "Não foi possível carregar as cobranças.";
}

export default function ChargesPage() {
  const [data, setData] =
    useState<ClientChargeListResponse | null>(null);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<ChargeFilter>("");

  const [page, setPage] =
    useState(1);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadCharges = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        const response = await getClientCharges({
          page,
          page_size: PAGE_SIZE,
          status:
            status as ClientChargeStatus | "",
          search: search || undefined,
        });

        setData(response);
      } catch (loadError) {
        setError(
          getErrorMessage(loadError),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      page,
      search,
      status,
    ],
  );

  useEffect(() => {
    void loadCharges();
  }, [loadCharges]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        setPage(1);
        setSearch(
          searchInput.trim(),
        );
      },
      450,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const summary = data?.summary ?? {
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    cancelled: 0,
    refunded: 0,
    total_amount: "0",
  };

  const items = data?.items ?? [];
  const totalPages = data?.pages ?? 0;

  const openAmount = useMemo(() => {
    return items
      .filter((charge) =>
        charge.status === "pending"
        || charge.status === "overdue"
      )
      .reduce(
        (total, charge) =>
          total + Number(charge.amount),
        0,
      );
  }, [items]);

  return (
    <div className="min-h-full text-[#211633]">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#7c2cff]">
              Financeiro
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#211633] md:text-4xl">
              Cobranças
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f687c]">
              Consulte suas cobranças, acompanhe vencimentos
              e visualize o histórico financeiro da sua conta.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={() =>
              void loadCharges(true)
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e6dff0] bg-white px-4 text-sm font-semibold text-[#4a4058] shadow-sm transition hover:border-[#b897f5] hover:bg-[#f8f4ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Atualizar
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6f687c]">
                  Total de cobranças
                </p>

                <p className="mt-3 text-3xl font-bold text-[#211633]">
                  {summary.total}
                </p>

                <p className="mt-1 text-xs text-[#81798d]">
                  Todo o histórico financeiro
                </p>
              </div>

              <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                <ReceiptText className="h-5 w-5" />
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6f687c]">
                  Pendentes
                </p>

                <p className="mt-3 text-3xl font-bold text-[#211633]">
                  {summary.pending}
                </p>

                <p className="mt-1 text-xs text-[#81798d]">
                  Aguardando pagamento
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6f687c]">
                  Pagas
                </p>

                <p className="mt-3 text-3xl font-bold text-[#211633]">
                  {summary.paid}
                </p>

                <p className="mt-1 text-xs text-[#81798d]">
                  Pagamentos confirmados
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6f687c]">
                  Valor em aberto
                </p>

                <p className="mt-3 text-2xl font-bold text-[#211633]">
                  {formatCurrency(openAmount)}
                </p>

                <p className="mt-1 text-xs text-[#81798d]">
                  Conforme a página atual
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-600">
                <Banknote className="h-5 w-5" />
              </div>
            </div>
          </article>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-[#ebe6f2] bg-white shadow-[0_16px_45px_rgba(48,31,77,0.07)]">
          <div className="space-y-4 border-b border-[#eee9f4] p-4 xl:flex xl:items-center xl:justify-between xl:space-y-0">
            <div className="relative w-full xl:max-w-lg">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8497]" />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Buscar número, descrição, produto ou licença..."
                className="h-11 w-full rounded-xl border border-[#ded7e7] bg-[#fbfaff] pl-10 pr-4 text-sm text-[#211633] outline-none transition placeholder:text-[#96909f] focus:border-[#8a3ffc] focus:ring-2 focus:ring-[#8a3ffc]/10"
              />
            </div>

            <div className="flex max-w-full overflow-x-auto rounded-xl border border-[#e4deeb] bg-[#f3f0f6] p-1">
              {STATUS_FILTERS.map(
                (filter) => {
                  const selected =
                    status === filter.value;

                  return (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setStatus(
                          filter.value,
                        );
                      }}
                      className={`h-9 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${
                        selected
                          ? "bg-[#7c2cff] text-white shadow-md shadow-purple-200"
                          : "text-[#81798d] hover:text-[#211633]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-[#7c2cff]" />

              <p className="text-sm font-medium text-[#6f687c]">
                Carregando cobranças...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="rounded-2xl border border-[#dccdff] bg-[#f1eaff] p-4 text-[#7c2cff]">
                <CreditCard className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-[#211633]">
                Nenhuma cobrança encontrada
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#756d80]">
                Quando uma cobrança for vinculada à sua conta,
                ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eee9f4]">
              {items.map((charge) => {
                const StatusIcon =
                  getStatusIcon(
                    charge.status,
                  );

                return (
                  <article
                    key={charge.id}
                    className="grid gap-5 p-5 transition hover:bg-[#fbf9ff] xl:grid-cols-[1.1fr_1fr_0.8fr_0.7fr_auto] xl:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-bold text-[#211633]">
                          {charge.charge_number}
                        </h2>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                            charge.status,
                          )}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {getStatusLabel(
                            charge.status,
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[#6f687c]">
                        {charge.description}
                      </p>

                      <p className="mt-1 text-xs text-[#81798d]">
                        Criada em{" "}
                        {formatDate(
                          charge.created_at,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#81798d]">
                        Produto e licença
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#393044]">
                        {charge.product_name
                          || "Sem produto vinculado"}
                      </p>

                      <p className="mt-1 text-xs text-[#81798d]">
                        {charge.license_number
                          || "Sem licença vinculada"}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#81798d]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Vencimento
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#393044]">
                        {formatDate(
                          charge.due_at,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-[#81798d]">
                        {getPaymentMethodLabel(
                          charge.payment_method,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#81798d]">
                        Valor
                      </p>

                      <p className="mt-2 text-lg font-bold text-[#7c2cff]">
                        {formatCurrency(
                          charge.amount,
                        )}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      {charge.status === "pending"
                      || charge.status === "overdue" ? (
                        <button
                          type="button"
                          disabled
                          title="Integração de pagamento será adicionada depois."
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7c2cff] px-4 text-sm font-bold text-white opacity-60"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pagar agora
                        </button>
                      ) : (
                        <span className="text-xs text-[#81798d]">
                          Atualizado em{" "}
                          {formatDate(
                            charge.updated_at,
                          )}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!isLoading
          && items.length > 0 ? (
            <footer className="flex flex-col gap-3 border-t border-[#eee9f4] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#756d80]">
                Exibindo {items.length} de{" "}
                {data?.total ?? 0} cobranças
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                    )
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#ded7e7] bg-white px-3 text-sm font-semibold text-[#51495d] transition hover:bg-[#f6f2fb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                <span className="px-2 text-sm font-semibold text-[#51495d]">
                  {page} de{" "}
                  {Math.max(
                    totalPages,
                    1,
                  )}
                </span>

                <button
                  type="button"
                  disabled={
                    totalPages === 0
                    || page >= totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1,
                    )
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#ded7e7] bg-white px-3 text-sm font-semibold text-[#51495d] transition hover:bg-[#f6f2fb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          ) : null}
        </section>

        <div className="rounded-2xl border border-[#e6dff0] bg-[#faf8fd] p-4">
          <p className="text-sm leading-6 text-[#6f687c]">
            O pagamento online será habilitado quando integrarmos
            o gateway financeiro. Por enquanto, esta área funciona
            como histórico e acompanhamento das cobranças.
          </p>
        </div>
      </div>
    </div>
  );
}
