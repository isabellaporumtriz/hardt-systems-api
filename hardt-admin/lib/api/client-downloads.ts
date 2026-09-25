import { api } from "@/lib/api/client";

import type {
  ClientDownloadAccessResponse,
  ClientDownloadFilters,
  ClientDownloadListResponse,
} from "@/lib/types/client-downloads";

export async function getClientDownloads(
  filters: ClientDownloadFilters = {},
): Promise<ClientDownloadListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(filters.page ?? 1));
  params.set("page_size", String(filters.page_size ?? 12));

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.platform?.trim()) {
    params.set("platform", filters.platform.trim());
  }

  const response = await api.get<ClientDownloadListResponse>(
    `/client/downloads?${params.toString()}`,
  );

  return response.data;
}

export async function getClientDownloadAccess(
  downloadId: string,
): Promise<ClientDownloadAccessResponse> {
  const response = await api.get<ClientDownloadAccessResponse>(
    `/client/downloads/${downloadId}/access`,
  );

  return response.data;
}
