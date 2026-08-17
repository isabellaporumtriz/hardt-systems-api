import { api } from "@/lib/api/client";


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
  const response = await api.get<ArgosOperation[]>(
    "/admin/argos/operations"
  );

  return response.data;
}


export async function createArgosOperation(
  companyName: string,
): Promise<ArgosOperation> {
  const response = await api.post<ArgosOperation>(
    "/admin/argos/operations",
    {
      company_name: companyName,
    },
  );

  return response.data;
}


export async function getArgosOperation(
  operationId: string,
): Promise<ArgosOperation> {
  const response = await api.get<ArgosOperation>(
    `/admin/argos/operations/${operationId}`
  );

  return response.data;
}


export async function listArgosJobs(
  operationId: string,
): Promise<ArgosJob[]> {
  const response = await api.get<ArgosJob[]>(
    `/admin/argos/operations/${operationId}/jobs`
  );

  return response.data;
}


export async function createArgosJob(
  operationId: string,
  action: string,
): Promise<ArgosJob> {
  const response = await api.post<ArgosJob>(
    `/admin/argos/operations/${operationId}/jobs`,
    {
      action,
    },
  );

  return response.data;
}
