export type ClientLicenseStatus =
  | "active"
  | "pending_activation"
  | "expired"
  | "suspended"
  | "revoked";

export type ClientLicenseSummary = {
  total: number;
  active: number;
  pending_activation: number;
  expired: number;
  suspended: number;
  revoked: number;
};

export type ClientLicenseItem = {
  id: string;
  license_number: string;
  key_preview: string;
  status: ClientLicenseStatus;

  product_id: string;
  product_name: string;
  product_slug: string;
  product_version: string;

  max_devices: number;
  active_devices: number;

  issued_at: string;
  first_activated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

export type ClientLicenseListResponse = {
  summary: ClientLicenseSummary;
  items: ClientLicenseItem[];

  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type ClientLicenseListParams = {
  page?: number;
  pageSize?: number;
  status?: ClientLicenseStatus | "";
  search?: string;
};
export type ClientLicenseKeyResponse = {
  license_id: string;
  license_number: string;
  license_key: string;
};

export type ClientLicenseRenewalResponse = {
  charge_id: string;
  charge_number: string;

  license_id: string;
  license_number: string;

  product_id: string;
  product_name: string;

  amount: string;
  status: string;

  invoice_url: string;

  asaas_customer_id: string;
  asaas_payment_id: string;
};
