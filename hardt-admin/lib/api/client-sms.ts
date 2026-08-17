import { api } from "@/lib/api/client";

export type SMSService = {
  code: string;
  name: string;
  available_count: number;
  price_brl: string | number;
};

type SMSCatalogResponse = {
  country: number;
  total: number;
  services: SMSService[];
};

export type SMSQuote = {
  country: number;
  service_code: string;
  service_name: string;

  available: boolean;
  available_count: number;

  price_brl: string | number;
};

export type SMSActivation = {
  id: string;
  purchase_id: string;

  phone_number: string | null;

  country_code: number;
  service_code: string;

  operator: string | null;

  customer_price: string | number;

  status: string;
  sms_code: string | null;

  expires_at: string | null;
  created_at: string;
  finished_at: string | null;
};

export async function getSMSCatalog(
  country = 73,
): Promise<SMSService[]> {
  const response =
    await api.get<SMSCatalogResponse>(
      "/sms/catalog",
      {
        params: {
          country,
        },
      },
    );

  return response.data.services;
}

export async function getSMSQuote(
  serviceCode: string,
  country = 73,
): Promise<SMSQuote> {
  const response =
    await api.get<SMSQuote>(
      "/sms/quote",
      {
        params: {
          country,
          service_code:
            serviceCode,
        },
      },
    );

  return response.data;
}

export async function purchaseSMSActivation(
  payload: {
    country: number;
    service_code: string;
    idempotency_key: string;
  },
): Promise<SMSActivation> {
  const response =
    await api.post<SMSActivation>(
      "/sms/activations",
      payload,
    );

  return response.data;
}

export async function listSMSActivations(): Promise<
  SMSActivation[]
> {
  const response =
    await api.get<SMSActivation[]>(
      "/sms/activations",
    );

  return response.data;
}

export async function syncSMSActivation(
  activationId: string,
): Promise<SMSActivation> {
  const response =
    await api.get<SMSActivation>(
      `/sms/activations/${activationId}/status`,
    );

  return response.data;
}

export async function cancelSMSActivation(
  activationId: string,
): Promise<SMSActivation> {
  const response =
    await api.post<SMSActivation>(
      `/sms/activations/${activationId}/cancel`,
    );

  return response.data;
}

export async function finishSMSActivation(
  activationId: string,
): Promise<SMSActivation> {
  const response =
    await api.post<SMSActivation>(
      `/sms/activations/${activationId}/finish`,
    );

  return response.data;
}
