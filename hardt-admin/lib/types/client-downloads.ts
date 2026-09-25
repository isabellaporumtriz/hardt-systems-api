export type ClientDownloadSummary = {
  total: number;
  products: number;
  platforms: number;
};

export type ClientDownloadItem = {
  id: string;

  product_id: string;
  product_name: string;
  product_description: string | null;

  version: string;
  platform: string;
  architecture: string | null;

  file_name: string;
  file_size_bytes: number | null;
  checksum_sha256: string | null;

  release_notes: string | null;
  published_at: string;
};

export type ClientDownloadListResponse = {
  summary: ClientDownloadSummary;

  items: ClientDownloadItem[];

  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type ClientDownloadAccessResponse = {
  id: string;
  file_name: string;
  file_url: string;
};

export type ClientDownloadFilters = {
  page?: number;
  page_size?: number;
  search?: string;
  platform?: string;
};
