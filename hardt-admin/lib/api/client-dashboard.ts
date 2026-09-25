import { api } from "@/lib/api/client";

import type {
  ClientDashboardData,
} from "@/lib/types/client-dashboard";

export async function getClientDashboard(): Promise<ClientDashboardData> {
  const response = await api.get<ClientDashboardData>(
    "/client/dashboard"
  );

  return response.data;
}
