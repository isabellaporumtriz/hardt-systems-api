"use client";

import {
  ArrowLeftRight,
  CircleDollarSign,
  Loader2,
  Plus,
  RefreshCw,
  TrendingUp,
  Trash2,
  WalletCards,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FinanceCashFlowCard,
  FinanceFilters,
  FinanceKpiCard,
  FinanceTimeSeriesChart,
  FinanceUnitGrid,
  formatCurrency,
  formatPercent,
  toFiniteNumber,
} from "@/components/finance";

import type {
  FinanceUnitFilter,
} from "@/components/finance";

import {
  createManualFinancialEntry,
  excludeFinancialLedgerSource,
  getCashFlow,
  getFinanceLedger,
  getFinanceTimeSeries,
  getManagementSummary,
  getProductPerformance,
} from "@/lib/api/finance-v2";

import type {
  FinanceBusinessUnit,
  FinanceGranularity,
  FinancePeriodParams,
  FinancialCashFlowSummary,
  FinancialLedgerItem,
  FinancialLedgerSourceType,
  FinancialManagementSummary,
  FinancialProductPerformanceSummary,
  FinancialTimeSeriesResponse,
  ManualFinancialEntryNature,
  ManualFinancialEntryStatus,
  ManualFinancialEntryType,
} from "@/lib/api/finance-v2";



type ManualEntryFormState = {
  entryType: ManualFinancialEntryType;
  businessUnit: FinanceBusinessUnit;
  nature: ManualFinancialEntryNature;
  productName: string;
  description: string;
  amount: string;
  occurredAt: string;
  paymentMethod: string;
  status: ManualFinancialEntryStatus;
  counterparty: string;
  notes: string;
};


function getLocalDateTimeValue(): string {
  const now = new Date();

  const offset =
    now.getTimezoneOffset() * 60_000;

  return new Date(
    now.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}


function getInitialManualEntryForm():
  ManualEntryFormState {
  return {
    entryType: "income",
    businessUnit: "hardt_systems",
    nature: "revenue",
    productName: "",
    description: "",
    amount: "",
    occurredAt: getLocalDateTimeValue(),
    paymentMethod: "pix",
    status: "settled",
    counterparty: "",
    notes: "",
  };
}


function toStartDateTime(
  value: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return `${value}T00:00:00-03:00`;
}


function addOneDay(
  value: string,
): string {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  date.setUTCDate(
    date.getUTCDate() + 1,
  );

  const nextYear = date.getUTCFullYear();

  const nextMonth = String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0");

  const nextDay = String(
    date.getUTCDate(),
  ).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}


function toExclusiveEndDateTime(
  value: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return `${addOneDay(value)}T00:00:00-03:00`;
}


function getUnitLabel(
  unit: FinanceUnitFilter,
): string {
  if (unit === "all") {
    return "Consolidado Hardt";
  }

  const labels: Record<
    FinanceBusinessUnit,
    string
  > = {
    hardt_api: "hardt.api",
    hardt_studio: "hardt.studio",
    hardt_systems: "hardt.systems",
    corporate: "Corporativo",
  };

  return labels[unit];
}


function getLedgerSourceLabel(
  sourceType: FinancialLedgerSourceType,
): string {
  const labels: Record<
    FinancialLedgerSourceType,
    string
  > = {
    charge: "Cobrança",
    purchase: "Compra no portal",
    wallet_topup: "Recarga de carteira",
    manual_entry: "Lançamento externo",
  };

  return labels[sourceType];
}


function getLedgerTypeLabel(
  item: FinancialLedgerItem,
): string {
  if (item.direction === "outflow") {
    return "Despesa";
  }

  if (item.impact === "cash") {
    return "Entrada de caixa";
  }

  return "Receita";
}


function getLedgerStatusLabel(
  status: string,
): string {
  const labels: Record<string, string> = {
    settled: "Realizado",
    paid: "Pago",
    completed: "Concluído",
    pending: "Pendente",
    processing: "Processando",
    overdue: "Vencido",
  };

  return labels[status] ?? status;
}


function formatLedgerDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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


export default function FinanceV2PreviewPage() {
  const [
    management,
    setManagement,
  ] = useState<
    FinancialManagementSummary | null
  >(null);

  const [
    products,
    setProducts,
  ] = useState<
    FinancialProductPerformanceSummary | null
  >(null);

  const [
    cashFlow,
    setCashFlow,
  ] = useState<
    FinancialCashFlowSummary | null
  >(null);

  const [
    timeSeries,
    setTimeSeries,
  ] = useState<
    FinancialTimeSeriesResponse | null
  >(null);

  const [
    businessUnit,
    setBusinessUnit,
  ] = useState<FinanceUnitFilter>("all");

  const [
    granularity,
    setGranularity,
  ] = useState<FinanceGranularity>("day");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);


  const [
    isManualEntryOpen,
    setIsManualEntryOpen,
  ] = useState(false);

  const [
    savingManualEntry,
    setSavingManualEntry,
  ] = useState(false);

  const [
    manualEntryError,
    setManualEntryError,
  ] = useState<string | null>(null);

  const [
    manualEntryForm,
    setManualEntryForm,
  ] = useState<ManualEntryFormState>(
    getInitialManualEntryForm,
  );


  const [
    ledger,
    setLedger,
  ] = useState<FinancialLedgerItem[]>([]);

  const [
    excludingLedgerKey,
    setExcludingLedgerKey,
  ] = useState<string | null>(null);


  const loadFinancialData = useCallback(
    async (
      isRefresh = false,
    ) => {
      if (
        startDate
        && endDate
        && endDate < startDate
      ) {
        setError(
          "A data final não pode ser anterior à data inicial.",
        );

        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const periodParams:
        FinancePeriodParams = {
          start_at:
            toStartDateTime(startDate),

          end_at:
            toExclusiveEndDateTime(
              endDate,
            ),
        };

      try {
        const [
          managementData,
          productData,
          cashData,
          timeSeriesData,
          ledgerData,
        ] = await Promise.all([
          getManagementSummary(
            periodParams,
          ),

          getProductPerformance(
            periodParams,
          ),

          getCashFlow(
            periodParams,
          ),

          getFinanceTimeSeries({
            ...periodParams,
            granularity,
            business_unit:
              businessUnit === "all"
                ? undefined
                : businessUnit,
          }),

          getFinanceLedger({
            ...periodParams,
            business_unit:
              businessUnit === "all"
                ? undefined
                : businessUnit,
          }),
        ]);

        setManagement(
          managementData,
        );

        setProducts(
          productData,
        );

        setCashFlow(
          cashData,
        );

        setTimeSeries(
          timeSeriesData,
        );


        setLedger(
          ledgerData,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : (
              "Não foi possível carregar "
              + "o Finance V2."
            ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      businessUnit,
      endDate,
      granularity,
      startDate,
    ],
  );


  useEffect(() => {
    const timeout = window.setTimeout(
      () => {
        void loadFinancialData();
      },
      0,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadFinancialData]);



  function openManualEntryModal() {
    setManualEntryError(null);
    setManualEntryForm(
      getInitialManualEntryForm(),
    );
    setIsManualEntryOpen(true);
  }


  function closeManualEntryModal() {
    if (savingManualEntry) {
      return;
    }

    setIsManualEntryOpen(false);
    setManualEntryError(null);
  }


  function updateManualEntryForm<
    K extends keyof ManualEntryFormState
  >(
    field: K,
    value: ManualEntryFormState[K],
  ) {
    setManualEntryForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "entryType") {
        next.nature =
          value === "income"
            ? "revenue"
            : "operating_expense";
      }


      if (field === "businessUnit") {
        next.productName = "";
      }

      return next;
    });
  }


  async function handleManualEntrySubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setManualEntryError(null);

    const amount = Number(
      manualEntryForm.amount
        .replace(",", "."),
    );

    if (
      !Number.isFinite(amount)
      || amount <= 0
    ) {
      setManualEntryError(
        "Informe um valor maior que zero.",
      );
      return;
    }

    if (
      manualEntryForm.description
        .trim()
        .length < 2
    ) {
      setManualEntryError(
        "Informe uma descrição.",
      );
      return;
    }

    const productName =
      manualEntryForm.productName.trim();

    if (productName.length < 2) {
      setManualEntryError(
        "Informe o produto ou serviço.",
      );
      return;
    }

    const normalizedProductName =
      productName.toLocaleLowerCase(
        "pt-BR",
      );

    const selectedProduct =
      products?.products.find(
        (product) =>
          product.product_id
          && (
            product.business_unit
            === manualEntryForm.businessUnit
          )
          && (
            product.product_name
              .trim()
              .toLocaleLowerCase(
                "pt-BR",
              )
            === normalizedProductName
          ),
      );

    const automaticCategory =
      productName;

    setSavingManualEntry(true);

    try {
      const occurredAt =
        new Date(
          manualEntryForm.occurredAt,
        ).toISOString();

      await createManualFinancialEntry({
        entry_type:
          manualEntryForm.entryType,

        business_unit:
          manualEntryForm.businessUnit,

        nature:
          manualEntryForm.nature,

        category:
          automaticCategory,

        product_id:
          selectedProduct?.product_id
            ?? null,

        description:
          manualEntryForm.description.trim(),

        amount,

        occurred_at: occurredAt,

        payment_method:
          manualEntryForm.paymentMethod
            || null,

        status:
          manualEntryForm.status,

        counterparty:
          manualEntryForm.counterparty
            .trim()
            || null,

        notes:
          manualEntryForm.notes.trim()
            || null,
      });

      setIsManualEntryOpen(false);

      await loadFinancialData(true);
    } catch (submitError) {
      setManualEntryError(
        submitError instanceof Error
          ? submitError.message
          : (
            "Não foi possível salvar "
            + "o lançamento."
          ),
      );
    } finally {
      setSavingManualEntry(false);
    }
  }



  async function handleExcludeLedgerItem(
    item: FinancialLedgerItem,
  ) {
    const confirmed = window.confirm(
      (
        "Excluir este item do Finance V2? "
        + "Ele sairá dos totais financeiros. "
        + "O registro de origem será preservado "
        + "quando aplicável."
      ),
    );

    if (!confirmed) {
      return;
    }

    const key =
      `${item.source_type}:${item.source_id}`;

    setExcludingLedgerKey(key);
    setError(null);

    try {
      await excludeFinancialLedgerSource(
        item.source_type,
        item.source_id,
      );

      await loadFinancialData(true);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : (
            "Não foi possível excluir "
            + "o item do Finance V2."
          ),
      );
    } finally {
      setExcludingLedgerKey(null);
    }
  }


  const selectedManagement =
    useMemo(() => {
      if (
        !management
        || businessUnit === "all"
      ) {
        return null;
      }

      return (
        management.units.find(
          (unit) =>
            unit.business_unit
            === businessUnit,
        )
        ?? null
      );
    }, [
      businessUnit,
      management,
    ]);


  const selectedCashUnit =
    useMemo(() => {
      if (
        !cashFlow
        || businessUnit === "all"
      ) {
        return null;
      }

      return (
        cashFlow.units.find(
          (unit) =>
            unit.business_unit
            === businessUnit,
        )
        ?? null
      );
    }, [
      businessUnit,
      cashFlow,
    ]);


  const visibleProducts =
    useMemo(() => {
      if (!products) {
        return [];
      }

      if (businessUnit === "all") {
        return products.products;
      }

      return products.products.filter(
        (product) =>
          product.business_unit
          === businessUnit,
      );
    }, [
      businessUnit,
      products,
    ]);


  const totalRevenue =
    selectedManagement
      ? selectedManagement.total_revenue
      : management?.total_revenue
        ?? "0";


  const directCosts =
    selectedManagement
      ? selectedManagement.direct_costs
      : management?.direct_costs
        ?? "0";


  const operatingExpenses =
    selectedManagement
      ? selectedManagement.operating_expenses
      : management?.operating_expenses
        ?? "0";


  const otherExpenses =
    selectedManagement
      ? selectedManagement.other_expenses
      : management?.other_expenses
        ?? "0";


  const totalCostsAndExpenses =
    (
      toFiniteNumber(directCosts)
      + toFiniteNumber(
        operatingExpenses,
      )
      + toFiniteNumber(
        otherExpenses,
      )
    );


  const netResult =
    selectedManagement
      ? selectedManagement.net_result
      : management?.net_result
        ?? "0";


  const netMargin =
    selectedManagement
      ? selectedManagement.net_margin_percent
      : management?.net_margin_percent
        ?? "0";


  const netCash =
    selectedCashUnit
      ? (
        selectedCashUnit
          .net_attributable_cash_flow
      )
      : cashFlow?.net_cash_flow
        ?? "0";


  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={34}
            className="mx-auto animate-spin text-violet-400"
          />

          <p className="mt-4 text-sm font-medium text-zinc-300">
            Carregando Finance V2...
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            DRE, caixa, produtos e série temporal
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-7">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
              Preview V2
            </span>

            <span className="text-xs text-zinc-600">
              Ainda não substitui /finance
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Financeiro
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            DRE gerencial, fluxo de caixa real,
            performance de produtos e unidades
            de negócio em uma visão consolidada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              void loadFinancialData(true)
            }
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-violet-500/40 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Atualizando..."
              : "Atualizar dados"}
          </button>

          <button
            type="button"
            onClick={
              openManualEntryModal
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500"
          >
            <Plus size={16} />
            Novo lançamento
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <FinanceFilters
        businessUnit={businessUnit}
        granularity={granularity}
        startDate={startDate}
        endDate={endDate}
        onBusinessUnitChange={
          setBusinessUnit
        }
        onGranularityChange={
          setGranularity
        }
        onStartDateChange={
          setStartDate
        }
        onEndDateChange={
          setEndDate
        }
      />

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Visão executiva
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              {getUnitLabel(
                businessUnit,
              )}
            </h2>
          </div>

          {businessUnit !== "all" && (
            <p className="text-xs text-zinc-600">
              Topups de carteira não são atribuídos
              automaticamente à unidade.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <FinanceKpiCard
            title="Receita"
            value={formatCurrency(
              totalRevenue,
            )}
            description={
              businessUnit === "all"
                ? (
                  "Receita realizada em "
                  + "todas as operações"
                )
                : (
                  "Receita realizada da "
                  + getUnitLabel(
                    businessUnit,
                  )
                )
            }
            icon={CircleDollarSign}
            tone="violet"
          />

          <FinanceKpiCard
            title="Custos + despesas"
            value={formatCurrency(
              totalCostsAndExpenses,
            )}
            description="Custos diretos e despesas reconhecidas"
            icon={ArrowLeftRight}
            tone={
              totalCostsAndExpenses > 0
                ? "rose"
                : "sky"
            }
          />

          <FinanceKpiCard
            title="Resultado líquido"
            value={formatCurrency(
              netResult,
            )}
            description={
              `Margem líquida de ${formatPercent(
                netMargin,
              )}`
            }
            icon={TrendingUp}
            tone={
              toFiniteNumber(netResult) >= 0
                ? "emerald"
                : "rose"
            }
          />

          <FinanceKpiCard
            title="Caixa líquido"
            value={formatCurrency(
              netCash,
            )}
            description={
              businessUnit === "all"
                ? (
                  "Entradas menos saídas "
                  + "efetivas"
                )
                : (
                  "Caixa atribuível à "
                  + "unidade selecionada"
                )
            }
            icon={WalletCards}
            tone={
              toFiniteNumber(netCash) >= 0
                ? "sky"
                : "rose"
            }
          />
        </div>
      </section>

      <FinanceTimeSeriesChart
        points={
          timeSeries?.points
          ?? []
        }
        granularity={
          granularity
        }
      />

      {management && cashFlow && (
        <FinanceUnitGrid
          managementUnits={
            management.units
          }
          cashUnits={
            cashFlow.units
          }
        />
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.65fr)_minmax(380px,0.55fr)]">
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
          <div className="flex flex-col gap-3 border-b border-zinc-800 p-5 sm:flex-row sm:items-end sm:justify-between lg:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Performance financeira
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Performance e lançamentos
              </h2>

              <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                Uma única visão das receitas,
                despesas e entradas de caixa que
                compõem o Finance V2.
              </p>
            </div>

            <p className="text-xs text-zinc-600">
              {ledger.length} movimento(s)
              {" · "}
              {visibleProducts.length}
              {" "}
              produto(s) / serviço(s)
            </p>
          </div>

          {ledger.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Nenhum movimento financeiro ativo
              para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead className="border-b border-zinc-800 bg-zinc-950/40">
                  <tr className="text-xs uppercase tracking-wide text-zinc-600">
                    <th className="px-5 py-3 font-semibold">
                      Produto / serviço
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Cliente / descrição
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Unidade
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Origem
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Tipo
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right font-semibold">
                      Valor
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Data
                    </th>

                    <th className="px-5 py-3 text-right font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800">
                  {ledger.map((item) => {
                    const key =
                      `${item.source_type}:${item.source_id}`;

                    const isExcluding =
                      excludingLedgerKey
                      === key;

                    const isOutflow =
                      item.direction
                      === "outflow";

                    return (
                      <tr
                        key={key}
                        className="transition hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white">
                            {item.product_name
                              ?? item.source_label}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {item.source_label}
                          </p>
                        </td>

                        <td className="max-w-[280px] px-4 py-4">
                          <p className="truncate text-sm text-zinc-300">
                            {item.description
                              || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {item.business_unit
                            ? getUnitLabel(
                                item.business_unit,
                              )
                            : "Não alocado"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300">
                            {getLedgerSourceLabel(
                              item.source_type,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              isOutflow
                                ? "rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300"
                                : "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300"
                            }
                          >
                            {getLedgerTypeLabel(
                              item,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {getLedgerStatusLabel(
                            item.status,
                          )}
                        </td>

                        <td
                          className={
                            isOutflow
                              ? "px-4 py-4 text-right font-semibold text-rose-300"
                              : "px-4 py-4 text-right font-semibold text-emerald-300"
                          }
                        >
                          {isOutflow
                            ? "-"
                            : "+"}
                          {formatCurrency(
                            item.amount,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-zinc-500">
                          {formatLedgerDate(
                            item.occurred_at,
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              void handleExcludeLedgerItem(
                                item,
                              )
                            }
                            disabled={isExcluding}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isExcluding ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={14} />
                            )}

                            {isExcluding
                              ? "Excluindo..."
                              : "Excluir do financeiro"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {cashFlow && (
          <FinanceCashFlowCard
            cashFlow={
              cashFlow
            }
          />
        )}
      </div>


      {isManualEntryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                  Finance V2
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Novo lançamento externo
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Registre uma receita ou despesa fora do portal.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeManualEntryModal
                }
                className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={
                handleManualEntrySubmit
              }
              className="space-y-5 p-6"
            >
              {manualEntryError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {manualEntryError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Tipo
                  </span>

                  <select
                    value={
                      manualEntryForm.entryType
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "entryType",
                        event.target.value as ManualFinancialEntryType,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    <option value="income">
                      Receita
                    </option>

                    <option value="expense">
                      Despesa
                    </option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Unidade
                  </span>

                  <select
                    value={
                      manualEntryForm.businessUnit
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "businessUnit",
                        event.target.value as FinanceBusinessUnit,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    <option value="hardt_api">
                      hardt.api
                    </option>

                    <option value="hardt_studio">
                      hardt.studio
                    </option>

                    <option value="hardt_systems">
                      hardt.systems
                    </option>

                    <option value="corporate">
                      Corporativo
                    </option>
                  </select>
                </label>
              </div>

              {manualEntryForm.entryType
                === "expense" && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Natureza da despesa
                  </span>

                  <select
                    value={
                      manualEntryForm.nature
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "nature",
                        event.target.value as ManualFinancialEntryNature,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    <option value="direct_cost">
                      Custo direto
                    </option>

                    <option value="operating_expense">
                      Despesa operacional
                    </option>

                    <option value="other">
                      Outros
                    </option>
                  </select>
                </label>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Valor
                  </span>

                  <input
                    required
                    inputMode="decimal"
                    placeholder="Ex.: 1500,00"
                    value={
                      manualEntryForm.amount
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "amount",
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Data
                  </span>

                  <input
                    required
                    type="datetime-local"
                    value={
                      manualEntryForm.occurredAt
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "occurredAt",
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-violet-500/50"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Produto / serviço
                  </span>

                  <input
                    required
                    list="finance-v2-product-options"
                    maxLength={160}
                    placeholder="Ex.: Landing Page"
                    value={
                      manualEntryForm.productName
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "productName",
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
                  />

                  <datalist
                    id="finance-v2-product-options"
                  >
                    {(
                      products?.products
                      ?? []
                    )
                      .filter(
                        (product) =>
                          product.product_id
                          && (
                            product.business_unit
                            === manualEntryForm.businessUnit
                          ),
                      )
                      .map((product) => (
                        <option
                          key={
                            product.product_id
                          }
                          value={
                            product.product_name
                          }
                        />
                      ))}
                  </datalist>

                  <p className="text-xs text-zinc-600">
                    Digite livremente. Se coincidir
                    com um produto cadastrado,
                    o vínculo é feito automaticamente.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Contraparte
                  </span>

                  <input
                    maxLength={160}
                    placeholder="Cliente ou fornecedor"
                    value={
                      manualEntryForm.counterparty
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "counterparty",
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">
                  Descrição
                </span>

                <input
                  required
                  maxLength={255}
                  placeholder="Descreva o lançamento"
                  value={
                    manualEntryForm.description
                  }
                  onChange={(event) =>
                    updateManualEntryForm(
                      "description",
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Forma de pagamento
                  </span>

                  <select
                    value={
                      manualEntryForm.paymentMethod
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "paymentMethod",
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    <option value="pix">
                      PIX
                    </option>

                    <option value="credit_card">
                      Cartão de crédito
                    </option>

                    <option value="debit_card">
                      Cartão de débito
                    </option>

                    <option value="bank_transfer">
                      Transferência
                    </option>

                    <option value="cash">
                      Dinheiro
                    </option>

                    <option value="other">
                      Outro
                    </option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Status
                  </span>

                  <select
                    value={
                      manualEntryForm.status
                    }
                    onChange={(event) =>
                      updateManualEntryForm(
                        "status",
                        event.target.value as ManualFinancialEntryStatus,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    <option value="settled">
                      Realizado
                    </option>

                    <option value="pending">
                      Pendente
                    </option>
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">
                  Observações
                </span>

                <textarea
                  rows={3}
                  maxLength={4000}
                  placeholder="Opcional"
                  value={
                    manualEntryForm.notes
                  }
                  onChange={(event) =>
                    updateManualEntryForm(
                      "notes",
                      event.target.value,
                    )
                  }
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeManualEntryModal
                  }
                  disabled={
                    savingManualEntry
                  }
                  className="h-10 rounded-xl border border-zinc-800 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    savingManualEntry
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingManualEntry && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {savingManualEntry
                    ? "Salvando..."
                    : "Salvar lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}




      <footer className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
        <p className="text-xs leading-5 text-zinc-600">
          DRE e fluxo de caixa são conceitos
          separados. Compras via carteira podem
          compor receita gerencial sem representar
          novo caixa no mesmo momento; topups podem
          representar caixa recebido antes do
          reconhecimento da receita.
        </p>
      </footer>
    </div>
  );
}
