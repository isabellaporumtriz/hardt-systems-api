import { api } from "@/lib/api/client";

export type LicenseStatus =
  | "pending_activation"
  | "active"
  | "expired"
  | "suspended"
  | "revoked";

export interface License {
  id: string;
  user_id: string;
  product_id: string;

  license_sequence: number;
  license_number: string;
  key_preview: string;

  status: LicenseStatus | string;

  duration_days: number;
  max_devices: number;

  issued_at: string;
  first_activated_at: string | null;
  expires_at: string | null;

  is_active: boolean;
}

export interface AdminLicense {
  id: string;
  license_number: string;
  key_preview: string;

  user_id: string;
  user_name: string;
  user_email: string;

  product_id: string;
  product_name: string;
  product_slug: string;

  status: LicenseStatus | string;

  duration_days: number;
  max_devices: number;
  active_devices: number;

  issued_at: string;
  first_activated_at: string | null;
  expires_at: string | null;

  is_active: boolean;
}

export interface LicenseCreate {
  user_id: string;
  product_id: string;
  duration_days: number;
  max_devices: number;
}

export interface LicenseCreateResponse {
  id: string;
  license_number: string;

  /**
   * A chave completa só é retornada
   * no momento da emissão.
   */
  license_key: string;

  key_preview: string;
  status: LicenseStatus | string;

  duration_days: number;
  max_devices: number;

  issued_at: string;
  first_activated_at: string | null;
  expires_at: string | null;

  is_active: boolean;
}

export interface LicenseActionResponse {
  success: boolean;
  message: string;
  license_id: string;
  license_number: string;
  status: LicenseStatus | string;
  expires_at: string | null;
}

export interface LicenseRenewRequest {
  additional_days: number;
}

export interface GetAdminLicensesParams {
  status?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export async function getLicenses(): Promise<
  AdminLicense[]
> {
  const response = await api.get<AdminLicense[]>(
    "/admin/licenses"
  );

  return response.data;
}

export async function getAdminLicenses(
  params?: GetAdminLicensesParams
): Promise<AdminLicense[]> {
  const response = await api.get<AdminLicense[]>(
    "/admin/licenses",
    {
      params,
    }
  );

  return response.data;
}

export async function getLicense(
  id: string
): Promise<License> {
  const response = await api.get<License>(
    `/licenses/${id}`
  );

  return response.data;
}

export async function createLicense(
  data: LicenseCreate
): Promise<LicenseCreateResponse> {
  const response =
    await api.post<LicenseCreateResponse>(
      "/licenses",
      data
    );

  return response.data;
}

export async function suspendLicense(
  id: string
): Promise<LicenseActionResponse> {
  const response =
    await api.post<LicenseActionResponse>(
      `/admin/licenses/${id}/suspend`
    );

  return response.data;
}

export async function restoreLicense(
  id: string
): Promise<LicenseActionResponse> {
  const response =
    await api.post<LicenseActionResponse>(
      `/admin/licenses/${id}/restore`
    );

  return response.data;
}

export async function revokeLicense(
  id: string
): Promise<LicenseActionResponse> {
  const response =
    await api.post<LicenseActionResponse>(
      `/admin/licenses/${id}/revoke`
    );

  return response.data;
}

export async function renewLicense(
  id: string,
  additionalDays: number
): Promise<LicenseActionResponse> {
  const data: LicenseRenewRequest = {
    additional_days: additionalDays,
  };

  const response =
    await api.post<LicenseActionResponse>(
      `/admin/licenses/${id}/renew`,
      data
    );

  return response.data;
}