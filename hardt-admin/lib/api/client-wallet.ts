import { api } from "@/lib/api/client";

export type Wallet = {
  id: string;
  balance: string;
};

export type WalletTransaction = {
  id: string;
  type: string;
  amount: string;
  reference: string | null;
  description: string | null;
  product_code: string | null;
  created_at: string;
};

export type WalletTopupPayload = {
  amount: number;
  cpf_cnpj?: string;
  mobile_phone?: string;
};

export type WalletTopup = {
  id: string;
  amount_brl: string;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  external_reference: string;
  pix_copy_paste: string | null;
  pix_qr_code: string | null;
  paid_at: string | null;
  created_at: string;
};

export async function getWallet(): Promise<Wallet> {
  const response = await api.get<Wallet>(
    "/wallet",
  );

  return response.data;
}

export async function getWalletTransactions(): Promise<
  WalletTransaction[]
> {
  const response = await api.get<WalletTransaction[]>(
    "/wallet/transactions",
  );

  return response.data;
}

export async function createWalletTopup(
  payload: WalletTopupPayload,
): Promise<WalletTopup> {
  const response = await api.post<WalletTopup>(
    "/wallet/topups",
    payload,
  );

  return response.data;
}

export async function reconcileWalletTopup(
  topupId: string,
): Promise<WalletTopup> {
  const response = await api.post<WalletTopup>(
    `/wallet/topups/${topupId}/reconcile`,
  );

  return response.data;
}

