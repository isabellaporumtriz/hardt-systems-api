import axios from "axios";

import { api } from "@/lib/api/client";


export interface AdminSystemInformation {
  app_name: string;
  app_version: string;
  environment: string;
  debug: boolean;
  access_token_expire_minutes: number;
  api_status: string;
}


export interface AdminSettings {
  admin_id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  system: AdminSystemInformation;
}


export interface AdminProfileUpdatePayload {
  name: string;
  email: string;
}


export interface AdminProfileUpdateResponse {
  success: boolean;
  message: string;
  admin_id: string;
  name: string;
  email: string;
  updated_at: string;
}


export interface AdminPasswordUpdatePayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}


export interface AdminPasswordUpdateResponse {
  success: boolean;
  message: string;
}


interface ApiErrorPayload {
  detail?: string | Array<{
    loc?: Array<string | number>;
    msg?: string;
    type?: string;
  }>;
}


function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return fallbackMessage;
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const validationMessage = detail
      .map((item) => item.msg)
      .filter(
        (message): message is string =>
          typeof message === "string",
      )
      .join(" ");

    if (validationMessage) {
      return validationMessage;
    }
  }

  if (error.code === "ECONNABORTED") {
    return "A API demorou muito para responder.";
  }

  if (!error.response) {
    return "Não foi possível se conectar à API.";
  }

  return fallbackMessage;
}


export async function getAdminSettings(): Promise<
  AdminSettings
> {
  try {
    const response = await api.get<AdminSettings>(
      "/admin/settings",
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Não foi possível carregar as configurações.",
      ),
    );
  }
}


export async function updateAdminProfile(
  payload: AdminProfileUpdatePayload,
): Promise<AdminProfileUpdateResponse> {
  try {
    const response =
      await api.patch<AdminProfileUpdateResponse>(
        "/admin/settings/profile",
        payload,
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Não foi possível atualizar o perfil.",
      ),
    );
  }
}


export async function updateAdminPassword(
  payload: AdminPasswordUpdatePayload,
): Promise<AdminPasswordUpdateResponse> {
  try {
    const response =
      await api.patch<AdminPasswordUpdateResponse>(
        "/admin/settings/password",
        payload,
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Não foi possível atualizar a senha.",
      ),
    );
  }
}