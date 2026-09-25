export type ClientProfileSummary = {
  id: string;
  name: string;
  email: string;
};

export type ClientLicenseSummary = {
  total: number;
  active: number;
  pending_activation: number;
  expired: number;
  suspended: number;
  revoked: number;
};

export type ClientDeviceSummary = {
  active: number;
  inactive: number;
  total: number;
  total_limit: number;
};

export type ClientFinanceSummary = {
  pending_amount: string;
  overdue_amount: string;
  pending_charges: number;
  overdue_charges: number;

  next_charge_id: string | null;
  next_charge_number: string | null;
  next_due_at: string | null;
  next_due_amount: string | null;

  last_payment_id: string | null;
  last_payment_number: string | null;
  last_payment_amount: string | null;
  last_payment_at: string | null;
};

export type ClientRecentLicense = {
  id: string;
  license_number: string;
  key_preview: string;
  status: string;

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

export type ClientRecentCharge = {
  id: string;
  charge_number: string;
  description: string;
  amount: string;
  status: string;
  payment_method: string | null;

  due_at: string;
  paid_at: string | null;
  created_at: string;

  product_id: string | null;
  product_name: string | null;

  license_id: string | null;
  license_number: string | null;
};

export type ClientDashboardData = {
  customer: ClientProfileSummary;
  licenses: ClientLicenseSummary;
  devices: ClientDeviceSummary;
  finance: ClientFinanceSummary;
  recent_licenses: ClientRecentLicense[];
  recent_charges: ClientRecentCharge[];
};
