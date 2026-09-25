import { api } from "@/lib/api/client";

export interface MonthlyCheckoutPayload {
  product_slug: string;
  cpf_cnpj: string;
  mobile_phone: string;
}

export interface MonthlyCheckoutResponse {
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
}

export async function createMonthlyCheckout(
  payload: MonthlyCheckoutPayload,
): Promise<MonthlyCheckoutResponse> {
  const response =
    await api.post<MonthlyCheckoutResponse>(
      "/billing/monthly-checkout",
      payload,
    );

  return response.data;
}

export interface OneTimeCheckoutPayload {
  product_slug: string;
  mobile_phone: string;
  cpf_cnpj: string;
  coupon_code?: string;
}

export interface OneTimeCheckoutResponse {
  charge_id: string;
  charge_number: string;

  product_id: string;
  product_name: string;
  product_slug: string;

  amount: string;
  status: string;

  invoice_url: string | null;

  asaas_customer_id: string | null;
  asaas_payment_id: string | null;

  pix_copy_paste: string;
  pix_qr_code: string | null;
  applied_coupon: string | null;
}

export async function createOneTimeCheckout(
  payload: OneTimeCheckoutPayload,
): Promise<OneTimeCheckoutResponse> {
  const response =
    await api.post<OneTimeCheckoutResponse>(
      "/billing/checkout",
      payload,
      { timeout: 30000 },
    );

  return response.data;
}


export async function resumeHardtMeetCheckout(): Promise<
  OneTimeCheckoutResponse
> {
  const response =
    await api.post<OneTimeCheckoutResponse>(
      "/billing/checkout/resume/hardt-meet",
      undefined,
      { timeout: 30000 },
    );

  return response.data;
}

