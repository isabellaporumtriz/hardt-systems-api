"use client";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
  UserRound,
  Users,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  cancelCharge,
  Charge,
  ChargeCreatePayload,
  ChargeStatus,
  createCharge,
  createAsaasMonthlyCheckout,
  FinancialSummary,
  getCharges,
  getFinancialDashboard,
  MonthlyRevenueItem,
  UpcomingCharge,
  markChargeAsPaid,
  markChargeAsPending,
  refundCharge,
} from "@/lib/api/finance";
import {
  AdminLicense,
  getAdminLicenses,
} from "@/lib/api/licenses";
import { getProducts } from "@/lib/api/products";
import {
  getUsers,
  User,
} from "@/lib/api/users";
import type { Product } from "@/lib/types/api";


const emptySummary: FinancialSummary = {
  total_charges: 0,

  total_revenue: "0",
  total_pending: "0",
  total_overdue: "0",
  total_cancelled: "0",
  total_refunded: "0",

  revenue_today: "0",
  revenue_current_month: "0",
  average_ticket: "0",

  paid_charges: 0,
  pending_charges: 0,
  overdue_charges: 0,
  cancelled_charges: 0,
  refunded_charges: 0,

  payments_current_month: 0,
  paying_customers: 0,
};


const statusOptions: Array<{
  value: ChargeStatus | "all";
  label: string;
}> = [
  {
    value: "all",
    label: "Todos os status",
  },
  {
    value: "pending",
    label: "Pendentes",
  },
  {
    value: "paid",
    label: "Pagas",
  },
  {
    value: "overdue",
    label: "Vencidas",
  },
  {
    value: "cancelled",
    label: "Canceladas",
  },
  {
    value: "refunded",
    label: "Estornadas",
  },
];


const paymentMethods = [
  {
    value: "",
    label: "Não informado",
  },
  {
    value: "pix",
    label: "PIX",
  },
  {
    value: "credit_card",
    label: "Cartão de crédito",
  },
  {
    value: "debit_card",
    label: "Cartão de débito",
  },
  {
    value: "bank_slip",
    label: "Boleto bancário",
  },
  {
    value: "bank_transfer",
    label: "Transferência bancária",
  },
  {
    value: "cash",
    label: "Dinheiro",
  },
  {
    value: "other",
    label: "Outro",
  },
];


interface ChargeFormState {
  cpf_cnpj: string;
  mobile_phone: string;
  user_id: string;
  product_id: string;
  license_id: string;
  description: string;
  amount: string;
  due_at: string;
  payment_method: string;
  external_reference: string;
  notes: string;
}


const initialChargeForm: ChargeFormState = {
  cpf_cnpj: "",
  mobile_phone: "",
  user_id: "",
  product_id: "",
  license_id: "",
  description: "",
  amount: "",
  due_at: "",
  payment_method: "",
  external_reference: "",
  notes: "",
};


function formatCurrency(
  value: string | number | null | undefined,
): string {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(numberValue);
}


function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}


function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}


function getStatusLabel(
  status: string,
): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    overdue: "Vencido",
    cancelled: "Cancelado",
    refunded: "Estornado",
  };

  return labels[status] ?? status;
}


function getPaymentMethodLabel(
  method: string | null,
): string {
  if (!method) {
    return "Não informado";
  }

  const option = paymentMethods.find(
    (item) => item.value === method,
  );

  return option?.label ?? method;
}


function getStatusClasses(
  status: string,
): string {
  const classes: Record<string, string> = {
    paid:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    pending:
      "border-amber-500/20 bg-amber-500/10 text-amber-300",
    overdue:
      "border-red-500/20 bg-red-500/10 text-red-300",
    cancelled:
      "border-zinc-600 bg-zinc-800 text-zinc-300",
    refunded:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  };

  return (
    classes[status]
    ?? "border-zinc-700 bg-zinc-800 text-zinc-300"
  );
}


function getStatusIcon(
  status: string,
) {
  if (status === "paid") {
    return CheckCircle2;
  }

  if (status === "pending") {
    return Clock3;
  }

  if (status === "overdue") {
    return AlertCircle;
  }

  if (status === "cancelled") {
    return XCircle;
  }

  if (status === "refunded") {
    return RotateCcw;
  }

  return ReceiptText;
}


function toInputDateValue(
  date: Date,
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getDefaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);

  return toInputDateValue(date);
}


interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}


function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend = "neutral",
}: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">
            {title}
          </p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-violet-300">
          <Icon size={21} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
        {trend === "up" && (
          <ArrowUpRight
            size={15}
            className="text-emerald-400"
          />
        )}

        {trend === "down" && (
          <ArrowDownRight
            size={15}
            className="text-red-400"
          />
        )}

        {description}
      </div>
    </div>
  );
}


interface StatusBadgeProps {
  status: string;
}


function StatusBadge({
  status,
}: StatusBadgeProps) {
  const Icon = getStatusIcon(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
        status,
      )}`}
    >
      <Icon size={13} />
      {getStatusLabel(status)}
    </span>
  );
}


interface RevenueChartProps {
  items: MonthlyRevenueItem[];
}


function RevenueChart({
  items,
}: RevenueChartProps) {
  const values = items.map(
    (item) => Number(item.revenue),
  );

  const maximum = Math.max(
    ...values,
    1,
  );

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Receita mensal
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Evolução dos pagamentos recebidos nos últimos 12 meses
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200">
          {formatCurrency(
            items.reduce(
              (total, item) =>
                total + Number(item.revenue),
              0,
            ),
          )}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-w-[720px] items-end gap-3">
          {items.map((item) => {
            const revenue = Number(
              item.revenue,
            );

            const height = revenue > 0
              ? Math.max(
                  18,
                  (revenue / maximum) * 190,
                )
              : 6;

            return (
              <div
                key={item.month}
                className="group flex min-w-0 flex-1 flex-col items-center"
              >
                <div className="mb-3 min-h-10 text-center opacity-0 transition group-hover:opacity-100">
                  <p className="text-xs font-semibold text-white">
                    {formatCurrency(revenue)}
                  </p>

                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {item.payments} pagamentos
                  </p>
                </div>

                <div className="flex h-48 w-full items-end justify-center">
                  <div
                    className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-violet-700 to-violet-400 transition duration-300 group-hover:from-violet-600 group-hover:to-violet-300"
                    style={{
                      height: `${height}px`,
                    }}
                    title={`${item.label}: ${formatCurrency(revenue)}`}
                  />
                </div>

                <p className="mt-3 text-center text-xs text-zinc-500">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function getUpcomingLabel(
  daysUntilDue: number,
): string {
  if (daysUntilDue <= 0) {
    return "Vence hoje";
  }

  if (daysUntilDue === 1) {
    return "Vence amanhã";
  }

  return `Vence em ${daysUntilDue} dias`;
}


interface UpcomingChargesProps {
  items: UpcomingCharge[];
  onSelect: (chargeId: string) => void;
}


function UpcomingCharges({
  items,
  onSelect,
}: UpcomingChargesProps) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Próximos vencimentos
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Cobranças pendentes que vencem nos próximos 7 dias
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 px-5 text-center">
          <CheckCircle2
            size={30}
            className="text-emerald-400"
          />

          <p className="mt-4 font-semibold text-white">
            Nenhum vencimento próximo
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Não há cobranças pendentes para os próximos 7 dias.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onSelect(item.id)
              }
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left transition hover:border-violet-500/30 hover:bg-zinc-900"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">
                    {item.user_name}
                  </p>

                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    {getUpcomingLabel(
                      item.days_until_due,
                    )}
                  </span>
                </div>

                <p className="mt-1 truncate text-sm text-zinc-500">
                  {item.charge_number} · {item.description}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  {formatDate(item.due_at)}
                  {item.product_name
                    ? ` · ${item.product_name}`
                    : ""}
                </p>
              </div>

              <p className="shrink-0 font-bold text-white">
                {formatCurrency(item.amount)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default function FinancePage() {
  const [summary, setSummary] =
    useState<FinancialSummary>(
      emptySummary,
    );

  const [charges, setCharges] = useState<
    Charge[]
  >([]);

  const [
    monthlyRevenue,
    setMonthlyRevenue,
  ] = useState<MonthlyRevenueItem[]>([]);

  const [
    upcomingCharges,
    setUpcomingCharges,
  ] = useState<UpcomingCharge[]>([]);

  const [users, setUsers] = useState<
    User[]
  >([]);

  const [products, setProducts] = useState<
    Product[]
  >([]);

  const [licenses, setLicenses] = useState<
    AdminLicense[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [actionLoadingId, setActionLoadingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<ChargeStatus | "all">(
      "all",
    );

  const [
    isCreateModalOpen,
    setIsCreateModalOpen,
  ] = useState(false);

  const [
    selectedCharge,
    setSelectedCharge,
  ] = useState<Charge | null>(null);

  const [
    openActionMenuId,
    setOpenActionMenuId,
  ] = useState<string | null>(null);

  const [form, setForm] =
    useState<ChargeFormState>({
      ...initialChargeForm,
      due_at: getDefaultDueDate(),
    });


  const loadFinanceData = useCallback(
    async (
      showRefreshLoader = false,
    ) => {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const [
          dashboardData,
          chargesData,
          usersData,
          productsData,
          licensesData,
        ] = await Promise.all([
          getFinancialDashboard(10),
          getCharges({
            limit: 500,
          }),
          getUsers(),
          getProducts(),
          getAdminLicenses({
            limit: 500,
          }),
        ]);

        setSummary(
          dashboardData.summary,
        );
        setMonthlyRevenue(
          dashboardData.monthly_revenue,
        );
        setUpcomingCharges(
          dashboardData.upcoming_charges,
        );
        setCharges(chargesData);
        setUsers(usersData);
        setProducts(productsData);
        setLicenses(licensesData);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar o financeiro.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );


  useEffect(() => {
    void loadFinanceData();
  }, [loadFinanceData]);


  useEffect(() => {
    if (!success) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setSuccess(null);
      },
      4000,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [success]);


  const filteredCharges = useMemo(
    () => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return charges.filter((charge) => {
        const matchesStatus =
          statusFilter === "all"
          || charge.status === statusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableValues = [
          charge.charge_number,
          charge.user_name,
          charge.user_email,
          charge.product_name,
          charge.license_number,
          charge.description,
          charge.external_reference,
        ];

        return searchableValues.some(
          (value) =>
            value
              ?.toLowerCase()
              .includes(normalizedSearch),
        );
      });
    },
    [
      charges,
      search,
      statusFilter,
    ],
  );


  const availableLicenses = useMemo(
    () => {
      return licenses.filter((license) => {
        if (
          form.user_id
          && license.user_id
          !== form.user_id
        ) {
          return false;
        }

        if (
          form.product_id
          && license.product_id
          !== form.product_id
        ) {
          return false;
        }

        return true;
      });
    },
    [
      licenses,
      form.user_id,
      form.product_id,
    ],
  );


  function openCreateModal() {
    setForm({
      ...initialChargeForm,
      due_at: getDefaultDueDate(),
    });

    setError(null);
    setIsCreateModalOpen(true);
  }


  function closeCreateModal() {
    if (submitting) {
      return;
    }

    setIsCreateModalOpen(false);
  }


  function updateFormField(
    field: keyof ChargeFormState,
    value: string,
  ) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "user_id") {
        next.license_id = "";
      }

      if (field === "product_id") {
        next.license_id = "";
      }

      if (field === "license_id") {
        const selectedLicense =
          licenses.find(
            (license) =>
              license.id === value,
          );

        if (selectedLicense) {
          next.user_id =
            selectedLicense.user_id;
          next.product_id =
            selectedLicense.product_id;
        }
      }

      return next;
    });
  }


  async function handleCreateCharge(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!form.user_id) {
      setError(
        "Selecione o cliente da cobrança.",
      );
      return;
    }

    if (!form.product_id) {
      setError(
        "Selecione o produto da cobrança.",
      );
      return;
    }

    const cpfCnpj = form.cpf_cnpj.replace(
      /\D/g,
      "",
    );

    if (
      cpfCnpj.length !== 11
      && cpfCnpj.length !== 14
    ) {
      setError(
        "Informe um CPF ou CNPJ válido.",
      );
      return;
    }

    const mobilePhone =
      form.mobile_phone.replace(
        /\D/g,
        "",
      );

    if (
      mobilePhone.length !== 10
      && mobilePhone.length !== 11
    ) {
      setError(
        "Informe um celular válido com DDD.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await createAsaasMonthlyCheckout({
          user_id: form.user_id,
          product_id: form.product_id,
          cpf_cnpj: cpfCnpj,
          mobile_phone: mobilePhone,
        });

      setSuccess(
        (
          `Cobrança criada no Asaas para `
          + `${response.user_name}. `
          + `O link de pagamento foi aberto.`
        ),
      );

      setForm({
        ...initialChargeForm,
        due_at: getDefaultDueDate(),
      });

      setIsCreateModalOpen(false);

      await loadFinanceData(true);

      const paymentWindow = window.open(
        response.invoice_url,
        "_blank",
        "noopener,noreferrer",
      );

      if (!paymentWindow) {
        await navigator.clipboard.writeText(
          response.invoice_url,
        );

        setSuccess(
          (
            "Cobrança criada no Asaas. "
            + "O navegador bloqueou a nova aba, "
            + "então o link foi copiado."
          ),
        );
      }
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : (
            "Não foi possível criar "
            + "a cobrança no Asaas."
          ),
      );
    } finally {
      setSubmitting(false);
    }
  }


  async function handleStatusAction(
    charge: Charge,
    action:
      | "paid"
      | "pending"
      | "cancelled"
      | "refunded",
  ) {
    setActionLoadingId(charge.id);
    setOpenActionMenuId(null);
    setError(null);
    setSuccess(null);

    try {
      let message = "";

      if (action === "paid") {
        const response =
          await markChargeAsPaid(
            charge.id,
            charge.payment_method
              ?? undefined,
          );

        message = response.message;
      }

      if (action === "pending") {
        const response =
          await markChargeAsPending(
            charge.id,
          );

        message = response.message;
      }

      if (action === "cancelled") {
        const confirmed =
          window.confirm(
            `Deseja cancelar a cobrança ${charge.charge_number}?`,
          );

        if (!confirmed) {
          return;
        }

        const response =
          await cancelCharge(
            charge.id,
          );

        message = response.message;
      }

      if (action === "refunded") {
        const confirmed =
          window.confirm(
            `Deseja estornar a cobrança ${charge.charge_number}?`,
          );

        if (!confirmed) {
          return;
        }

        const response =
          await refundCharge(
            charge.id,
          );

        message = response.message;
      }

      setSuccess(
        message
        || "Cobrança atualizada com sucesso.",
      );

      if (
        selectedCharge?.id
        === charge.id
      ) {
        setSelectedCharge(null);
      }

      await loadFinanceData(true);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível atualizar a cobrança.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }


  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-violet-400" />

          <p className="mt-4 text-sm text-zinc-400">
            Carregando financeiro...
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-violet-300">
              <WalletCards size={23} />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Financeiro
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Controle de cobranças, pagamentos e receita.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              void loadFinanceData(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Atualizar
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Nova cobrança
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-300 transition hover:text-white"
            aria-label="Fechar alerta"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{success}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              setSuccess(null)
            }
            className="text-emerald-300 transition hover:text-white"
            aria-label="Fechar mensagem"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Receita recebida"
          value={formatCurrency(
            summary.total_revenue,
          )}
          description={`${summary.paid_charges} cobranças pagas`}
          icon={CircleDollarSign}
          trend="up"
        />

        <MetricCard
          title="Valores pendentes"
          value={formatCurrency(
            summary.total_pending,
          )}
          description={`${summary.pending_charges} cobranças aguardando`}
          icon={Clock3}
        />

        <MetricCard
          title="Valores vencidos"
          value={formatCurrency(
            summary.total_overdue,
         )}
          description={`${summary.overdue_charges} cobranças vencidas`}
          icon={AlertCircle}
          trend={
            summary.overdue_charges > 0
              ? "down"
              : "neutral"
          }
        />

        <MetricCard
          title="Clientes pagantes"
          value={String(
            summary.paying_customers,
          )}
          description={`${summary.total_charges} cobranças registradas`}
          icon={Users}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Receita hoje"
          value={formatCurrency(
            summary.revenue_today,
          )}
          description="Pagamentos confirmados hoje"
          icon={Banknote}
          trend="up"
        />

        <MetricCard
          title="Receita do mês"
          value={formatCurrency(
            summary.revenue_current_month,
          )}
          description={`${summary.payments_current_month} pagamentos no mês`}
          icon={CalendarDays}
          trend="up"
        />

        <MetricCard
          title="Ticket médio"
          value={formatCurrency(
            summary.average_ticket,
          )}
          description="Média das cobranças pagas"
          icon={CreditCard}
        />

        <MetricCard
          title="Pagamentos no mês"
          value={String(
            summary.payments_current_month,
          )}
          description="Cobranças recebidas no período"
          icon={ReceiptText}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <RevenueChart
          items={monthlyRevenue}
        />

        <UpcomingCharges
          items={upcomingCharges}
          onSelect={(chargeId) => {
            const charge = charges.find(
              (item) =>
                item.id === chargeId,
            );

            if (charge) {
              setSelectedCharge(charge);
            }
          }}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-zinc-800 p-2.5 text-zinc-300">
              <XCircle size={18} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Cancelado
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {formatCurrency(
                  summary.total_cancelled,
                )}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            {summary.cancelled_charges} cobranças canceladas
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-300">
              <RotateCcw size={18} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Estornado
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {formatCurrency(
                  summary.total_refunded,
                )}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            {summary.refunded_charges} cobranças estornadas
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300">
              <ReceiptText size={18} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Total de cobranças
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {summary.total_charges}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Histórico completo do sistema
          </p>
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 p-5 lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Cobranças
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {filteredCharges.length} registros encontrados
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-80">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Buscar cliente, cobrança..."
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60"
                />
              </div>

              <div className="relative sm:w-52">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as ChargeStatus | "all",
                    )
                  }
                  className="w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 pr-10 text-sm text-zinc-300 outline-none transition focus:border-violet-500/60"
                >
                  {statusOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {statusOptions.map(
              (option) => {
                const isActive =
                  statusFilter
                  === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        option.value,
                      )
                    }
                    className={
                      isActive
                        ? "rounded-xl border border-violet-500/30 bg-violet-500/15 px-3.5 py-2 text-xs font-semibold text-violet-200"
                        : "rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
                    }
                  >
                    {option.label}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {filteredCharges.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-500">
              <ReceiptText size={34} />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">
              Nenhuma cobrança encontrada
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Crie a primeira cobrança ou altere os filtros de pesquisa.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <Plus size={17} />
              Criar no Asaas
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-4 font-medium">
                    Cobrança
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Cliente
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Produto
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Vencimento
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Valor
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCharges.map(
                  (charge) => (
                    <tr
                      key={charge.id}
                      className="border-b border-zinc-800/80 transition last:border-b-0 hover:bg-zinc-800/30"
                    >
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCharge(
                              charge,
                            )
                          }
                          className="text-left"
                        >
                          <p className="font-semibold text-white transition hover:text-violet-300">
                            {charge.charge_number}
                          </p>

                          <p className="mt-1 max-w-56 truncate text-xs text-zinc-500">
                            {charge.description}
                          </p>
                        </button>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-medium text-zinc-200">
                          {charge.user_name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {charge.user_email}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm text-zinc-300">
                          {charge.product_name
                            ?? "Sem produto"}
                        </p>

                        {charge.license_number && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {charge.license_number}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                          <CalendarDays
                            size={15}
                            className="text-zinc-500"
                          />

                          {formatDate(
                            charge.due_at,
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-semibold text-white">
                          {formatCurrency(
                            charge.amount,
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge
                          status={charge.status}
                        />
                      </td>

                      <td className="relative px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionMenuId(
                              (current) =>
                                current
                                === charge.id
                                  ? null
                                  : charge.id,
                            )
                          }
                          disabled={
                            actionLoadingId
                            === charge.id
                          }
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
                          aria-label="Abrir ações"
                        >
                          {actionLoadingId
                          === charge.id ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <MoreHorizontal
                              size={18}
                            />
                          )}
                        </button>

                        {openActionMenuId
                          === charge.id && (
                          <div className="absolute right-6 top-16 z-20 w-56 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 p-2 text-left shadow-2xl shadow-black/40">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCharge(
                                  charge,
                                );
                                setOpenActionMenuId(
                                  null,
                                );
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                            >
                              <FileText
                                size={16}
                              />
                              Ver detalhes
                            </button>

                            {charge.status
                              !== "paid"
                              && charge.status
                              !== "refunded"
                              && charge.status
                              !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleStatusAction(
                                    charge,
                                    "paid",
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-300 transition hover:bg-emerald-500/10"
                              >
                                <Check
                                  size={16}
                                />
                                Marcar como paga
                              </button>
                            )}

                            {(charge.status
                              === "paid"
                              || charge.status
                              === "overdue") && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleStatusAction(
                                    charge,
                                    "pending",
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-amber-300 transition hover:bg-amber-500/10"
                              >
                                <Undo2
                                  size={16}
                                />
                                Voltar para pendente
                              </button>
                            )}

                            {charge.status
                              === "paid" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleStatusAction(
                                    charge,
                                    "refunded",
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-blue-300 transition hover:bg-blue-500/10"
                              >
                                <RotateCcw
                                  size={16}
                                />
                                Estornar cobrança
                              </button>
                            )}

                            {charge.status
                              !== "cancelled"
                              && charge.status
                              !== "refunded" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleStatusAction(
                                    charge,
                                    "cancelled",
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
                              >
                                <XCircle
                                  size={16}
                                />
                                Cancelar cobrança
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 p-6 backdrop-blur">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                    <ReceiptText
                      size={22}
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Nova cobrança
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      Crie uma assinatura mensal diretamente no Asaas.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
                className="rounded-xl border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white disabled:opacity-50"
                aria-label="Fechar modal"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={handleCreateCharge}
              className="p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    Cliente *
                  </span>

                  <select
                    value={form.user_id}
                    onChange={(event) =>
                      updateFormField(
                        "user_id",
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500/60"
                  >
                    <option value="">
                      Selecione um cliente
                    </option>

                    {users
                      .filter(
                        (user) =>
                          !user.is_admin,
                      )
                      .map((user) => (
                        <option
                          key={user.id}
                          value={user.id}
                        >
                          {user.name} — {user.email}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    Produto mensal *
                  </span>

                  <select
                    value={form.product_id}
                    onChange={(event) =>
                      updateFormField(
                        "product_id",
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500/60"
                  >
                    <option value="">
                      Selecione um produto
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.name}
                          {" — "}
                          {formatCurrency(
                            product.price,
                          )}
                          /mês
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    CPF ou CNPJ *
                  </span>

                  <input
                    value={form.cpf_cnpj}
                    onChange={(event) =>
                      updateFormField(
                        "cpf_cnpj",
                        event.target.value,
                      )
                    }
                    placeholder="Somente números"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    maxLength={18}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    Celular com DDD *
                  </span>

                  <input
                    value={form.mobile_phone}
                    onChange={(event) =>
                      updateFormField(
                        "mobile_phone",
                        event.target.value,
                      )
                    }
                    placeholder="11999999999"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    maxLength={20}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60"
                  />
                </label>

                <div className="md:col-span-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                  <p className="text-sm font-semibold text-violet-200">
                    Assinatura mensal pelo Asaas
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    A cobrança será criada no Asaas.
                    Após a confirmação do pagamento,
                    o webhook criará a licença
                    automaticamente para o cliente.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={submitting}
                  className="rounded-2xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Criando no Asaas...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Criar cobrança
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-white">
                    {selectedCharge.charge_number}
                  </h2>

                  <StatusBadge
                    status={
                      selectedCharge.status
                    }
                  />
                </div>

                <p className="mt-2 text-sm text-zinc-500">
                  Criada em{" "}
                  {formatDateTime(
                    selectedCharge.created_at,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCharge(null)
                }
                className="rounded-xl border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                aria-label="Fechar detalhes"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-6">
                <p className="text-sm text-violet-200/70">
                  Valor da cobrança
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {formatCurrency(
                    selectedCharge.amount,
                  )}
                </p>

                <p className="mt-3 text-sm text-violet-200/70">
                  {selectedCharge.description}
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <UserRound size={16} />
                    <span className="text-xs uppercase tracking-wider">
                      Cliente
                    </span>
                  </div>

                  <p className="mt-3 font-semibold text-white">
                    {selectedCharge.user_name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedCharge.user_email}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Banknote size={16} />
                    <span className="text-xs uppercase tracking-wider">
                      Pagamento
                    </span>
                  </div>

                  <p className="mt-3 font-semibold text-white">
                    {getPaymentMethodLabel(
                      selectedCharge.payment_method,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Pago em{" "}
                    {formatDate(
                      selectedCharge.paid_at,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CalendarDays
                      size={16}
                    />
                    <span className="text-xs uppercase tracking-wider">
                      Vencimento
                    </span>
                  </div>

                  <p className="mt-3 font-semibold text-white">
                    {formatDate(
                      selectedCharge.due_at,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CreditCard size={16} />
                    <span className="text-xs uppercase tracking-wider">
                      Produto
                    </span>
                  </div>

                  <p className="mt-3 font-semibold text-white">
                    {selectedCharge.product_name
                      ?? "Sem produto"}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedCharge.license_number
                      ?? "Sem licença vinculada"}
                  </p>
                </div>
              </div>

              {(selectedCharge.external_reference
                || selectedCharge.notes) && (
                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  {selectedCharge.external_reference && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500">
                        Referência externa
                      </p>

                      <p className="mt-2 break-all text-sm text-zinc-300">
                        {selectedCharge.external_reference}
                      </p>
                    </div>
                  )}

                  {selectedCharge.notes && (
                    <div
                      className={
                        selectedCharge.external_reference
                          ? "mt-5 border-t border-zinc-800 pt-5"
                          : ""
                      }
                    >
                      <p className="text-xs uppercase tracking-wider text-zinc-500">
                        Observações
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {selectedCharge.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-6">
                {selectedCharge.status
                  !== "paid"
                  && selectedCharge.status
                  !== "cancelled"
                  && selectedCharge.status
                  !== "refunded" && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleStatusAction(
                        selectedCharge,
                        "paid",
                      )
                    }
                    disabled={
                      actionLoadingId
                      === selectedCharge.id
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Check size={17} />
                    Marcar como paga
                  </button>
                )}

                {selectedCharge.status
                  === "paid" && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleStatusAction(
                        selectedCharge,
                        "refunded",
                      )
                    }
                    disabled={
                      actionLoadingId
                      === selectedCharge.id
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    <RotateCcw
                      size={17}
                    />
                    Estornar
                  </button>
                )}

                {selectedCharge.status
                  !== "cancelled"
                  && selectedCharge.status
                  !== "refunded" && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleStatusAction(
                        selectedCharge,
                        "cancelled",
                      )
                    }
                    disabled={
                      actionLoadingId
                      === selectedCharge.id
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <XCircle size={17} />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}   