import { api } from "@/lib/api/client";


export type FinanceBusinessUnit =
  | "hardt_api"
  | "hardt_studio"
  | "hardt_systems"
  | "corporate";


export type FinanceGranularity =
  | "day"
  | "month";


export type MoneyValue = string;


export type ManualFinancialEntryType =
  | "income"
  | "expense";


export type ManualFinancialEntryNature =
  | "revenue"
  | "direct_cost"
  | "operating_expense"
  | "other";


export type ManualFinancialEntryStatus =
  | "pending"
  | "settled"
  | "cancelled";


export interface ManualFinancialEntryCreatePayload {
  entry_type: ManualFinancialEntryType;
  business_unit: FinanceBusinessUnit;
  nature: ManualFinancialEntryNature;
  category: string;

  product_id?: string | null;
  user_id?: string | null;

  counterparty?: string | null;
  description: string;
  amount: number | string;

  payment_method?: string | null;

  status?: ManualFinancialEntryStatus;

  occurred_at: string;
  settled_at?: string | null;

  external_reference?: string | null;
  notes?: string | null;
}


export interface ManualFinancialEntry {
  id: string;

  entry_type: ManualFinancialEntryType;
  business_unit: FinanceBusinessUnit;
  nature: ManualFinancialEntryNature;
  category: string;

  product_id: string | null;
  user_id: string | null;

  counterparty: string | null;
  description: string;
  amount: MoneyValue;

  payment_method: string | null;

  status: ManualFinancialEntryStatus;

  occurred_at: string;
  settled_at: string | null;

  external_reference: string | null;
  notes: string | null;

  created_by_user_id: string;

  created_at: string;
  updated_at: string;
}



export type FinancialLedgerSourceType =
  | "charge"
  | "purchase"
  | "wallet_topup"
  | "manual_entry";


export type FinancialLedgerDirection =
  | "inflow"
  | "outflow";


export type FinancialLedgerImpact =
  | "dre"
  | "cash"
  | "dre_cash";


export interface FinancialLedgerItem {
  source_type: FinancialLedgerSourceType;
  source_id: string;

  source_label: string;

  business_unit: FinanceBusinessUnit | null;

  product_id: string | null;
  product_name: string | null;

  direction: FinancialLedgerDirection;
  impact: FinancialLedgerImpact;

  description: string;
  amount: MoneyValue;

  status: string;

  occurred_at: string;

  is_manual: boolean;
}


export interface FinanceLedgerParams
  extends FinancePeriodParams {
  business_unit?: FinanceBusinessUnit;
}


export interface FinancialExclusionActionResponse {
  source_type: string;
  source_id: string;
  excluded: boolean;
}


export interface ManualFinancialEntryListParams {
  entry_type?: ManualFinancialEntryType;
  business_unit?: FinanceBusinessUnit;
  nature?: ManualFinancialEntryNature;
  status?: ManualFinancialEntryStatus;
  product_id?: string;
  search?: string;
  start_at?: string;
  end_at?: string;
  offset?: number;
  limit?: number;
}


export interface FinancePeriodParams {
  start_at?: string;
  end_at?: string;
}


// ============================================================
// MANAGEMENT SUMMARY
// ============================================================

export interface FinancialManagementUnit {
  business_unit: FinanceBusinessUnit;

  charge_revenue: MoneyValue;
  purchase_revenue: MoneyValue;
  manual_revenue: MoneyValue;
  total_revenue: MoneyValue;

  sms_provider_cost: MoneyValue;
  smm_provider_cost: MoneyValue;
  manual_direct_cost: MoneyValue;
  direct_costs: MoneyValue;

  gross_profit: MoneyValue;
  gross_margin_percent: MoneyValue;

  operating_expenses: MoneyValue;
  other_expenses: MoneyValue;

  net_result: MoneyValue;
  net_margin_percent: MoneyValue;

  revenue_share_percent: MoneyValue;
}


export interface FinancialManagementSummary {
  start_at: string | null;
  end_at: string | null;

  charge_revenue: MoneyValue;
  purchase_revenue: MoneyValue;
  manual_revenue: MoneyValue;
  total_revenue: MoneyValue;

  sms_provider_cost: MoneyValue;
  smm_provider_cost: MoneyValue;
  manual_direct_cost: MoneyValue;
  direct_costs: MoneyValue;

  gross_profit: MoneyValue;
  gross_margin_percent: MoneyValue;

  operating_expenses: MoneyValue;
  other_expenses: MoneyValue;

  net_result: MoneyValue;
  net_margin_percent: MoneyValue;

  units: FinancialManagementUnit[];
}


// ============================================================
// PRODUCT PERFORMANCE
// ============================================================

export interface FinancialProductPerformanceItem {
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  business_unit: FinanceBusinessUnit;

  charge_count: number;
  purchase_count: number;
  manual_income_count: number;
  total_sales_count: number;

  charge_revenue: MoneyValue;
  purchase_revenue: MoneyValue;
  manual_revenue: MoneyValue;
  total_revenue: MoneyValue;

  sms_provider_cost: MoneyValue;
  smm_provider_cost: MoneyValue;
  manual_direct_cost: MoneyValue;
  direct_costs: MoneyValue;

  gross_profit: MoneyValue;
  gross_margin_percent: MoneyValue;

  operating_expenses: MoneyValue;
  other_expenses: MoneyValue;

  net_result: MoneyValue;
  net_margin_percent: MoneyValue;

  revenue_share_percent: MoneyValue;
}


export interface FinancialProductPerformanceSummary {
  start_at: string | null;
  end_at: string | null;

  total_revenue: MoneyValue;
  direct_costs: MoneyValue;
  gross_profit: MoneyValue;

  operating_expenses: MoneyValue;
  other_expenses: MoneyValue;

  net_result: MoneyValue;

  products: FinancialProductPerformanceItem[];
}


// ============================================================
// CASH FLOW
// ============================================================

export interface FinancialCashFlowUnit {
  business_unit: FinanceBusinessUnit;

  charge_inflows: MoneyValue;
  manual_inflows: MoneyValue;
  attributable_inflows: MoneyValue;

  charge_refund_outflows: MoneyValue;
  manual_outflows: MoneyValue;
  attributable_outflows: MoneyValue;

  net_attributable_cash_flow: MoneyValue;
}


export interface FinancialCashFlowSummary {
  start_at: string | null;
  end_at: string | null;

  charge_inflow_count: number;
  charge_inflows: MoneyValue;

  wallet_topup_count: number;
  wallet_topup_inflows: MoneyValue;

  manual_inflow_count: number;
  manual_inflows: MoneyValue;

  total_inflows: MoneyValue;

  charge_refund_count: number;
  charge_refund_outflows: MoneyValue;

  manual_outflow_count: number;
  manual_outflows: MoneyValue;

  total_outflows: MoneyValue;

  net_cash_flow: MoneyValue;

  unallocated_wallet_inflows: MoneyValue;

  units: FinancialCashFlowUnit[];
}


// ============================================================
// TIME SERIES
// ============================================================

export interface FinancialTimeSeriesPoint {
  period_start: string;

  charge_revenue: MoneyValue;
  purchase_revenue: MoneyValue;
  manual_revenue: MoneyValue;
  total_revenue: MoneyValue;

  sms_provider_cost: MoneyValue;
  smm_provider_cost: MoneyValue;
  manual_direct_cost: MoneyValue;
  direct_costs: MoneyValue;

  operating_expenses: MoneyValue;
  other_expenses: MoneyValue;

  gross_profit: MoneyValue;
  net_result: MoneyValue;

  charge_inflows: MoneyValue;
  wallet_topup_inflows: MoneyValue;
  manual_inflows: MoneyValue;
  total_inflows: MoneyValue;

  charge_refund_outflows: MoneyValue;
  manual_outflows: MoneyValue;
  total_outflows: MoneyValue;

  net_cash_flow: MoneyValue;
}


export interface FinancialTimeSeriesResponse {
  granularity: FinanceGranularity;
  timezone: string;

  business_unit: FinanceBusinessUnit | null;

  start_at: string | null;
  end_at: string | null;

  points: FinancialTimeSeriesPoint[];
}


export interface FinanceTimeSeriesParams
  extends FinancePeriodParams {
  granularity?: FinanceGranularity;
  business_unit?: FinanceBusinessUnit;
}


// ============================================================
// REQUESTS
// ============================================================

export async function getManagementSummary(
  params?: FinancePeriodParams,
): Promise<FinancialManagementSummary> {
  const response =
    await api.get<FinancialManagementSummary>(
      "/admin/finance/management-summary",
      {
        params,
      },
    );

  return response.data;
}


export async function getProductPerformance(
  params?: FinancePeriodParams,
): Promise<FinancialProductPerformanceSummary> {
  const response =
    await api.get<FinancialProductPerformanceSummary>(
      "/admin/finance/product-performance",
      {
        params,
      },
    );

  return response.data;
}


export async function getCashFlow(
  params?: FinancePeriodParams,
): Promise<FinancialCashFlowSummary> {
  const response =
    await api.get<FinancialCashFlowSummary>(
      "/admin/finance/cash-flow",
      {
        params,
      },
    );

  return response.data;
}


export async function getFinanceTimeSeries(
  params?: FinanceTimeSeriesParams,
): Promise<FinancialTimeSeriesResponse> {
  const response =
    await api.get<FinancialTimeSeriesResponse>(
      "/admin/finance/time-series",
      {
        params,
      },
    );

  return response.data;
}




export async function getFinanceLedger(
  params?: FinanceLedgerParams,
): Promise<FinancialLedgerItem[]> {
  const response =
    await api.get<FinancialLedgerItem[]>(
      "/admin/finance/ledger",
      {
        params,
      },
    );

  return response.data;
}


export async function excludeFinancialLedgerSource(
  sourceType: FinancialLedgerSourceType,
  sourceId: string,
): Promise<FinancialExclusionActionResponse> {
  const response =
    await api.post<FinancialExclusionActionResponse>(
      (
        "/admin/finance/ledger/"
        + `${sourceType}/${sourceId}/exclude`
      ),
    );

  return response.data;
}



export async function listManualFinancialEntries(
  params?: ManualFinancialEntryListParams,
): Promise<ManualFinancialEntry[]> {
  const response =
    await api.get<ManualFinancialEntry[]>(
      "/admin/finance/manual-entries",
      {
        params,
      },
    );

  return response.data;
}


export async function cancelManualFinancialEntry(
  entryId: string,
): Promise<ManualFinancialEntry> {
  const response =
    await api.post<ManualFinancialEntry>(
      `/admin/finance/manual-entries/${entryId}/cancel`,
    );

  return response.data;
}


export async function createManualFinancialEntry(
  payload: ManualFinancialEntryCreatePayload,
): Promise<ManualFinancialEntry> {
  const response =
    await api.post<ManualFinancialEntry>(
      "/admin/finance/manual-entries",
      payload,
    );

  return response.data;
}
