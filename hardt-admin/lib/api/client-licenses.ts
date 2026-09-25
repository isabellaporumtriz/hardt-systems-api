import { api } from "@/lib/api/client";

import type {
  ClientLicenseKeyResponse,
  ClientLicenseListParams,
  ClientLicenseListResponse,
  ClientLicenseRenewalResponse,
} from "@/lib/types/client-licenses";

export type HardtMeetTrialResponse = {
  id: string;
  license_number: string;
  license_key: string;
  key_preview: string;
  status: string;
  trial_days: number;
  first_activated_at: string | null;
  expires_at: string | null;
};

export async function getClientLicenses(
  params: ClientLicenseListParams = {}
): Promise<ClientLicenseListResponse> {
  const response =
    await api.get<ClientLicenseListResponse>(
      "/client/licenses",
      {
        params: {
          page: params.page ?? 1,
          page_size: params.pageSize ?? 10,
          status: params.status || undefined,
          search: params.search?.trim() || undefined,
        },
      }
    );

  return response.data;
}

export async function getClientLicenseKey(
  licenseId: string
): Promise<ClientLicenseKeyResponse> {
  const response =
    await api.get<ClientLicenseKeyResponse>(
      `/client/licenses/${licenseId}/key`
    );

  return response.data;
}

export async function renewClientLicense(
  licenseId: string
): Promise<ClientLicenseRenewalResponse> {
  const response =
    await api.post<ClientLicenseRenewalResponse>(
      `/client/licenses/${licenseId}/renew`
    );

  return response.data;
}

export async function claimHardtMeetTrial(): Promise<
  HardtMeetTrialResponse
> {
  const response =
    await api.post<HardtMeetTrialResponse>(
      "/licenses/trial/hardt-meet"
    );

  return response.data;
}
