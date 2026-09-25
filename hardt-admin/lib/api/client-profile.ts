import { api } from "@/lib/api/client";

export type ClientProfile = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientProfileUpdatePayload = {
  name: string;
  email: string;
};

export type ClientProfileUpdateResponse = {
  success: boolean;
  message: string;
  profile: ClientProfile;
};

export type ClientPasswordUpdatePayload = {
  current_password: string;
  new_password: string;
};

export type ClientPasswordUpdateResponse = {
  success: boolean;
  message: string;
};

export async function getClientProfile(): Promise<ClientProfile> {
  const response = await api.get<ClientProfile>(
    "/client/profile",
  );

  return response.data;
}

export async function updateClientProfile(
  payload: ClientProfileUpdatePayload,
): Promise<ClientProfileUpdateResponse> {
  const response =
    await api.patch<ClientProfileUpdateResponse>(
      "/client/profile",
      payload,
    );

  return response.data;
}

export async function updateClientPassword(
  payload: ClientPasswordUpdatePayload,
): Promise<ClientPasswordUpdateResponse> {
  const response =
    await api.patch<ClientPasswordUpdateResponse>(
      "/client/profile/password",
      payload,
    );

  return response.data;
}
