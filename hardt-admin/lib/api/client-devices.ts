import { api } from "@/lib/api/client";

import type {
  ClientDeviceFilters,
  ClientDeviceListResponse,
  ClientDeviceStatusResponse,
} from "@/lib/types/client-devices";

export async function getClientDevices(
  params: ClientDeviceFilters = {},
): Promise<ClientDeviceListResponse> {
  const response =
    await api.get<ClientDeviceListResponse>(
      "/client/devices",
      {
        params: {
          page: params.page ?? 1,
          page_size: params.pageSize ?? 10,
          search: params.search?.trim() || undefined,
          is_active:
            typeof params.isActive === "boolean"
              ? params.isActive
              : undefined,
        },
      },
    );

  return response.data;
}

export async function deactivateClientDevice(
  deviceId: string,
): Promise<ClientDeviceStatusResponse> {
  const response =
    await api.patch<ClientDeviceStatusResponse>(
      `/client/devices/${deviceId}/deactivate`,
    );

  return response.data;
}