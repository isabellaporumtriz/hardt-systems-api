import { api } from "@/lib/api/client";


export interface AdminDevice {
  id: string;

  license_id: string;
  license_number: string;

  user_id: string;
  user_name: string;
  user_email: string;

  product_id: string;
  product_name: string;
  product_slug: string;

  device_identifier: string;
  name: string | null;
  operating_system: string | null;

  activated_at: string;
  last_validated_at: string | null;

  is_active: boolean;
}


export interface DeviceRemovalResponse {
  success: boolean;
  message: string;
  device_id: string;
  license_id: string;
}


export interface GetAdminDevicesParams {
  active_only?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}


export async function getAdminDevices(
  params?: GetAdminDevicesParams
): Promise<AdminDevice[]> {
  const response = await api.get<AdminDevice[]>(
    "/admin/devices",
    {
      params,
    }
  );

  return response.data;
}


export async function removeDevice(
  deviceId: string
): Promise<DeviceRemovalResponse> {
  if (!deviceId.trim()) {
    throw new Error(
      "O identificador do dispositivo é obrigatório."
    );
  }

  const response =
    await api.delete<DeviceRemovalResponse>(
      `/admin/devices/${deviceId}`
    );

  return response.data;
}