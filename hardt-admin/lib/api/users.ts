import { api } from "@/lib/api/client";

export interface User {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
}

export async function getUsers(): Promise<User[]> {
  const response = await api.get<User[]>(
    "/admin/users"
  );

  return response.data;
}

export async function createUser(
  data: UserCreate
): Promise<User> {
  const response = await api.post<User>(
    "/users",
    data
  );

  return response.data;
}