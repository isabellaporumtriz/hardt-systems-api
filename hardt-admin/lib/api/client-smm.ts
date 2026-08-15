import { api } from "@/lib/api/client";

export type SMMService = {
  provider_service_id: number;
  name: string;
  category: string;
  service_type: string;

  min_quantity: number;
  max_quantity: number;

  refill: boolean;
  cancel: boolean;

  hardt_rate_usd_per_1000: number | string;
};

export type SMMCatalogResponse = {
  total: number;
  services: SMMService[];
};

export type SMMQuote = {
  provider_service_id: number;
  service_name: string;
  category: string;
  quantity: number;

  hardt_rate_usd_per_1000: number | string;

  hardt_price_usd: number | string;

  usd_brl_rate: number | string;

  amount_brl: number | string;
};

export type SMMPurchaseDetail = {
  purchase_id: string;
  product_id: string;
  product_name: string;

  status: string;
  quantity: number;
  amount_brl: number | string;
  created_at: string;

  service_name: string;
  category: string | null;
  target_url: string;

  provider_status: string;
  start_count: number | null;
  remains: number | null;

  refill_available: boolean;
  cancel_available: boolean;
};

export async function getSMMCatalog(): Promise<SMMService[]> {
  const response = await api.get<SMMCatalogResponse>("/smm/catalog");

  return response.data.services;
}

export async function createSMMQuote(
  serviceId: number,
  quantity: number,
  targetUrl: string,
): Promise<SMMQuote> {
  const response = await api.post<SMMQuote>("/smm/quote", {
    service_id: serviceId,
    quantity,
    target_url: targetUrl,
  });

  return response.data;
}

export async function getSMMPurchaseDetail(
  purchaseId: string,
): Promise<SMMPurchaseDetail> {
  const response = await api.get<SMMPurchaseDetail>(
    `/store/purchases/${purchaseId}/smm`,
  );

  return response.data;
}


export type SMMPurchaseRequest = {
  service_id: number;
  quantity: number;
  target_url: string;
  idempotency_key: string;
};

export async function purchaseSMM(
  payload: SMMPurchaseRequest,
) {
  const response = await api.post(
    "/smm/purchases",
    payload,
  );

  return response.data;
}
