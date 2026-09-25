export type ClientDeviceSummary = {
  active: number;
  inactive: number;
  total: number;
  total_limit: number;
};

export type ClientDevice = {
  id: string;
  device_identifier: string;
  name: string | null;
  operating_system: string | null;
  app_version: string | null;
  ip_address: string | null;
  last_ip_address: string | null;
  activated_at: string;
  last_validated_at: string | null;
  is_active: boolean;

  license_id: string;
  license_number: string;
  license_status: string;

  product_id: string;
  product_name: string;
  product_version: string;
};

export type ClientDeviceListResponse = {
  summary: ClientDeviceSummary;
  items: ClientDevice[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type ClientDeviceStatusResponse = {
  id: string;
  is_active: boolean;
  message: string;
};

export type ClientDeviceFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
};
