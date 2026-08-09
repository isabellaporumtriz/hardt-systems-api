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
