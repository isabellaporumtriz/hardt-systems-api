import { api } from "@/lib/api/client";


export type ArgosCompanyData = {
  cnpj: string;

  razao_social: string;
  nome_fantasia: string;

  data_abertura: string;
  situacao_cadastral: string;

  cnae_principal: string;
  atividade_principal: string;
  natureza_juridica: string;

  logradouro: string;
  numero: string;
  complemento: string;

  bairro: string;
  cidade: string;
  estado: string;
  cep: string;

  email: string;
  telefone: string;
};


export type ArgosCnpjIntake = {
  id: string;

  document_type: string;
  status: string;

  original_filename: string;
  mime_type: string;
  size_bytes: number;

  extracted_data:
    | Partial<ArgosCompanyData>
    | null;

  parse_error: string | null;

  operation_id: string | null;
  confirmed_at: string | null;

  created_at: string;
  updated_at: string;
};


export type ArgosCnpjBatchItem = {
  id: string;
  batch_id: string;

  row_number: number;

  cnpj_original: string;
  cnpj_normalized: string | null;

  status: string;
  error: string | null;

  operation_id: string | null;

  created_at: string;
  updated_at: string;
};


export type ArgosCnpjBatch = {
  id: string;

  status: string;

  original_filename: string;
  mime_type: string;
  size_bytes: number;

  total_rows: number;
  valid_count: number;
  duplicate_count: number;
  invalid_count: number;

  created_by_user_id: string | null;

  created_at: string;
  updated_at: string;
};


export type ArgosCnpjBatchDetail =
  ArgosCnpjBatch & {
    items: ArgosCnpjBatchItem[];
  };


export type ArgosOperation = {
  id: string;

  company_name: string;
  client_slug: string;

  status: string;
  current_step: string;

  domain_candidates: string[];

  domain: string | null;
  site_url: string | null;
  business_id: string | null;

  last_message: string | null;

  company_data:
    | ArgosCompanyData
    | null;

  company_data_confirmed_at:
    | string
    | null;

  legacy_reconciliation_status:
    | string
    | null;

  legacy_source:
    | string
    | null;

  legacy_evidence:
    | Record<string, unknown>
    | null;

  legacy_reconciled_at:
    | string
    | null;

  created_at: string;
  updated_at: string;
};


export type ArgosJob = {
  id: string;
  operation_id: string;

  action: string;
  status: string;

  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;

  error: string | null;

  worker_id: string | null;
  claimed_at: string | null;
  finished_at: string | null;

  created_at: string;
  updated_at: string;
};


export async function listArgosOperations(): Promise<
  ArgosOperation[]
> {
  const response =
    await api.get<ArgosOperation[]>(
      "/admin/argos/operations",
    );

  return response.data;
}


export async function uploadArgosCnpjBatch(
  file: File,
): Promise<ArgosCnpjBatch> {
  const formData = new FormData();

  formData.append(
    "file",
    file,
  );

  const response =
    await api.post<ArgosCnpjBatch>(
      "/admin/argos/cnpj-batches",
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
      },
    );

  return response.data;
}


export async function getArgosCnpjBatch(
  batchId: string,
): Promise<ArgosCnpjBatchDetail> {
  const response =
    await api.get<ArgosCnpjBatchDetail>(
      `/admin/argos/cnpj-batches/${batchId}`,
    );

  return response.data;
}


export async function uploadArgosCnpjCard(
  file: File,
): Promise<ArgosCnpjIntake> {
  const formData = new FormData();

  formData.append(
    "file",
    file,
  );

  const response =
    await api.post<ArgosCnpjIntake>(
      "/admin/argos/intakes/cnpj-card",
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
      },
    );

  return response.data;
}


export async function getArgosCnpjIntake(
  intakeId: string,
): Promise<ArgosCnpjIntake> {
  const response =
    await api.get<ArgosCnpjIntake>(
      `/admin/argos/intakes/${intakeId}`,
    );

  return response.data;
}


export async function confirmArgosCnpjIntake(
  intakeId: string,
  companyData: ArgosCompanyData,
): Promise<ArgosOperation> {
  const response =
    await api.post<ArgosOperation>(
      `/admin/argos/intakes/${intakeId}/confirm`,
      {
        company_data: companyData,
      },
    );

  return response.data;
}


export async function decideArgosLegacyReconciliation(
  operationId: string,
  decision: "confirm" | "reject",
): Promise<ArgosOperation> {
  const response =
    await api.post<ArgosOperation>(
      `/admin/argos/operations/${operationId}/legacy-reconciliation/decision`,
      {
        decision,
      },
    );

  return response.data;
}


export async function getArgosOperation(
  operationId: string,
): Promise<ArgosOperation> {
  const response =
    await api.get<ArgosOperation>(
      `/admin/argos/operations/${operationId}`,
    );

  return response.data;
}


export async function listArgosJobs(
  operationId: string,
): Promise<ArgosJob[]> {
  const response =
    await api.get<ArgosJob[]>(
      `/admin/argos/operations/${operationId}/jobs`,
    );

  return response.data;
}


export async function createArgosJob(
  operationId: string,
  action: string,
  selectedDomain?: string,
): Promise<ArgosJob> {
  const response =
    await api.post<ArgosJob>(
      `/admin/argos/operations/${operationId}/jobs`,
      {
        action,
        selected_domain:
          selectedDomain ?? null,
      },
    );

  return response.data;
}
