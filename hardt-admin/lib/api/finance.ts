import axios from "axios";

import { api } from "@/lib/api/client";


export type ChargeStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";


export interface Charge {
  id: string;
  charge_number: string;

  user_id: string;
  user_name: string;
  user_email: string;

  product_id: string | null;
  product_name: string | null;
  product_slug: string | null;

  license_id: string | null;
  license_number: string | null;

  description: string;
  amount: string;
  status: ChargeStatus | string;

  payment_method: string | null;

  due_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;

  external_reference: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}


export interface FinancialSummary {
  total_charges: number;

  total_revenue: string;
  total_pending: string;
  total_overdue: string;
  total_cancelled: string;
  total_refunded: string;

  revenue_today: string;
  revenue_current_month: string;
  average_ticket: string;

  paid_charges: number;
  pending_charges: number;
  overdue_charges: number;
  cancelled_charges: number;
  refunded_charges: number;

  payments_current_month: number;
  paying_customers: number;
}


export interface MonthlyRevenueItem {
  month: string;
  label: string;
  revenue: string;
  payments: number;
}


export interface UpcomingCharge {
  id: string;
  charge_number: string;

  user_id: string;
  user_name: string;
  user_email: string;

  product_id: string | null;
  product_name: string | null;

  license_id: string | null;
  license_number: string | null;

  description: string;
  amount: string;
  status: ChargeStatus | string;
  due_at: string;

  days_until_due: number;
}


export interface FinancialDashboard {
  summary: FinancialSummary;
  monthly_revenue: MonthlyRevenueItem[];
  upcoming_charges: UpcomingCharge[];
  recent_charges: Charge[];
}


export interface ChargeCreatePayload {
  user_id: string;

  product_id?: string | null;
  license_id?: string | null;

  description: string;
  amount: number | string;
  due_at: string;

  payment_method?: string | null;
  external_reference?: string | null;
  notes?: string | null;
}


export interface ChargeUpdatePayload {
  description?: string;
  amount?: number | string;
  due_at?: string;

  payment_method?: string | null;
  external_reference?: string | null;
  notes?: string | null;
}


export interface ChargeStatusUpdatePayload {
  status: ChargeStatus | string;
  payment_method?: string | null;
  paid_at?: string | null;
  notes?: string | null;
}


export interface ChargeCreateResponse {
  success: boolean;
  message: string;
  charge: Charge;
}


export interface ChargeUpdateResponse {
  success: boolean;
  message: string;
  charge: Charge;
}


export interface ChargeStatusUpdateResponse {
  success: boolean;
  message: string;

  charge_id: string;
  charge_number: string;
  status: ChargeStatus | string;

  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  updated_at: string;
}


export interface GetChargesParams {
  status?: ChargeStatus | string;
  search?: string;
  offset?: number;
  limit?: number;
}


interface ApiErrorPayload {
  detail?: string | Array<{
    loc?: Array<string | number>;
    msg?: string;
    type?: string;
  }>;
}


function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return fallbackMessage;
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const validationMessage = detail
      .map((item) => item.msg)
      .filter(
        (message): message is string =>
          typeof message === "string",
      )
      .join(" ");

    if (validationMessage) {
      return validationMessage;
    }
  }

  if (error.response?.status === 401) {
    return "Sua sessão expirou. Entre novamente.";
  }

  if (error.response?.status === 403) {
    return (
      "Você não tem permissão para acessar "
      + "o financeiro."
    );
  }

  if (error.response?.status === 404) {
    return (
      "A cobrança informada não foi encontrada."
    );
  }

  if (error.response?.status === 409) {
    return (
      typeof detail === "string"
        ? detail
        : (
          "Não foi possível concluir a operação "
          + "devido a um conflito."
        )
    );
  }

  if (error.code === "ECONNABORTED") {
    return (
      "A API demorou muito para responder."
    );
  }

  if (!error.response) {
    return (
      "Não foi possível se conectar à API."
    );
  }

  return fallbackMessage;
}


export async function getFinancialDashboard(
  recentLimit = 10,
): Promise<FinancialDashboard> {
  try {
    const response =
      await api.get<FinancialDashboard>(
        "/admin/finance/dashboard",
        {
          params: {
            recent_limit: recentLimit,
          },
        },
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível carregar "
          + "o painel financeiro."
        ),
      ),
    );
  }
}


export async function getFinancialSummary(): Promise<
  FinancialSummary
> {
  try {
    const response =
      await api.get<FinancialSummary>(
        "/admin/finance/summary",
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível carregar "
          + "o resumo financeiro."
        ),
      ),
    );
  }
}


export async function getCharges(
  params?: GetChargesParams,
): Promise<Charge[]> {
  try {
    const response = await api.get<Charge[]>(
      "/admin/finance/charges",
      {
        params,
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível carregar "
          + "as cobranças."
        ),
      ),
    );
  }
}


export async function getCharge(
  chargeId: string,
): Promise<Charge> {
  if (!chargeId.trim()) {
    throw new Error(
      (
        "O identificador da cobrança "
        + "é obrigatório."
      ),
    );
  }

  try {
    const response = await api.get<Charge>(
      `/admin/finance/charges/${chargeId}`,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível carregar "
          + "a cobrança."
        ),
      ),
    );
  }
}


export async function createCharge(
  payload: ChargeCreatePayload,
): Promise<ChargeCreateResponse> {
  try {
    const response =
      await api.post<ChargeCreateResponse>(
        "/admin/finance/charges",
        payload,
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível criar "
          + "a cobrança."
        ),
      ),
    );
  }
}


export async function updateCharge(
  chargeId: string,
  payload: ChargeUpdatePayload,
): Promise<ChargeUpdateResponse> {
  if (!chargeId.trim()) {
    throw new Error(
      (
        "O identificador da cobrança "
        + "é obrigatório."
      ),
    );
  }

  try {
    const response =
      await api.patch<ChargeUpdateResponse>(
        `/admin/finance/charges/${chargeId}`,
        payload,
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível atualizar "
          + "a cobrança."
        ),
      ),
    );
  }
}


export async function updateChargeStatus(
  chargeId: string,
  payload: ChargeStatusUpdatePayload,
): Promise<ChargeStatusUpdateResponse> {
  if (!chargeId.trim()) {
    throw new Error(
      (
        "O identificador da cobrança "
        + "é obrigatório."
      ),
    );
  }

  try {
    const response =
      await api.patch<ChargeStatusUpdateResponse>(
        (
          `/admin/finance/charges/`
          + `${chargeId}/status`
        ),
        payload,
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível alterar "
          + "o status da cobrança."
        ),
      ),
    );
  }
}


export async function markChargeAsPaid(
  chargeId: string,
  paymentMethod?: string,
): Promise<ChargeStatusUpdateResponse> {
  return updateChargeStatus(
    chargeId,
    {
      status: "paid",
      payment_method:
        paymentMethod?.trim() || null,
    },
  );
}


export async function markChargeAsPending(
  chargeId: string,
): Promise<ChargeStatusUpdateResponse> {
  return updateChargeStatus(
    chargeId,
    {
      status: "pending",
    },
  );
}


export async function cancelCharge(
  chargeId: string,
  notes?: string,
): Promise<ChargeStatusUpdateResponse> {
  return updateChargeStatus(
    chargeId,
    {
      status: "cancelled",
      notes: notes?.trim() || null,
    },
  );
}


export async function refundCharge(
  chargeId: string,
  notes?: string,
): Promise<ChargeStatusUpdateResponse> {
  return updateChargeStatus(
    chargeId,
    {
      status: "refunded",
      notes: notes?.trim() || null,
    },
  );
}

export interface AdminAsaasMonthlyCheckoutPayload {
  user_id: string;
  product_id: string;
  cpf_cnpj: string;
  mobile_phone: string;
}


export interface AdminAsaasMonthlyCheckoutResponse {
  subscription_id: string;

  product_id: string;
  product_name: string;
  product_slug: string;

  amount: string;
  cycle: string;
  status: string;

  invoice_url: string;

  asaas_customer_id: string;
  asaas_subscription_id: string;
  asaas_payment_id: string;

  user_id: string;
  user_name: string;
  user_email: string;
}


export async function createAsaasMonthlyCheckout(
  payload: AdminAsaasMonthlyCheckoutPayload,
): Promise<AdminAsaasMonthlyCheckoutResponse> {
  try {
    const response =
      await api.post<AdminAsaasMonthlyCheckoutResponse>(
        "/admin/finance/asaas/monthly-checkout",
        payload,
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        (
          "Não foi possível criar a cobrança "
          + "mensal no Asaas."
        ),
      ),
    );
  }
}
