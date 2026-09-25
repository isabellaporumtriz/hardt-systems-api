import { api } from "@/lib/api/client";

import type {
  AdminLicense,
  DashboardData,
} from "@/lib/types/api";

export async function getDashboard(): Promise<DashboardData> {
  const response = await api.get<DashboardData>(
    "/admin/dashboard"
  );

  return response.data;
}

export async function getLicenses(): Promise<AdminLicense[]> {
  const response = await api.get<AdminLicense[]>(
    "/admin/licenses"
  );

  return response.data;
}