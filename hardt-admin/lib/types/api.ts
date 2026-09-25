export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type AdminIdentity = {
  id: string;
  name: string;
  email: string;
};

export type DashboardData = {
  admin: AdminIdentity;

  total_users: number;
  total_products: number;
  total_licenses: number;
  total_devices: number;
  active_devices: number;

  pending_activation_licenses: number;
  active_licenses: number;
  expired_licenses: number;
  suspended_licenses: number;
  revoked_licenses: number;
};

export type AdminLicense = {
  id: string;
  license_number: string;
  key_preview: string;

  user_id: string;
  user_name: string;
  user_email: string;

  product_id: string;
  product_name: string;
  product_slug: string;

  status: string;
  duration_days: number;
  max_devices: number;
  active_devices: number;

  issued_at: string;
  first_activated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};
export type Product = {
  id: string;

  name: string;
  slug: string;
  description: string | null;

  version: string;
  price: number;

  is_active: boolean;

  created_at: string;
  updated_at: string;
};

export type ProductCreate = {
  name: string;
  slug: string;
  description?: string;
  version: string;
  price: number;
  is_active: boolean;
};

export type ProductUpdate = Partial<ProductCreate>;
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};
