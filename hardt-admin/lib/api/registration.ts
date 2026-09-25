import { api } from "@/lib/api/client";


export type RegisterUserPayload = {
  name: string;
  email: string;
  password: string;
};


export type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};


export async function registerUser(
  payload: RegisterUserPayload,
): Promise<RegisteredUser> {
  const response = await api.post<RegisteredUser>(
    "/users",
    payload,
  );

  return response.data;
}
