"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityLog,
  type ArgosLogEntry,
} from "@/components/argos/activity-log";
import { CnpjIntakeCard } from "@/components/argos/cnpj-intake-card";
import { LegacyReconciliationCard } from "@/components/argos/legacy-reconciliation-card";
import {
  WorkflowStep,
  type ArgosStepStatus,
} from "@/components/argos/workflow-step";

import {
  confirmArgosCnpjIntake,
  createArgosJob,
  decideArgosLegacyReconciliation,
  getArgosOperation,
  listArgosJobs,
  listArgosOperations,
  uploadArgosCnpjCard,
  type ArgosCnpjIntake,
  type ArgosCompanyData,
  type ArgosJob,
  type ArgosOperation,
} from "@/lib/api/client-argos";


type StepDefinition = {
  id: string;
  title: string;
  description: string;
  action: string;
  acceptsFile?: boolean;
};


const workflow: StepDefinition[] = [
  {
    id: "domain",
    title: "Endereço web",
    description:
      "Aloca um subdomínio em um root existente. Se o lote estiver cheio, o Argos abre um novo domínio raiz.",
    action: "Alocar / abrir lote",
  },
  {
    id: "landing",
    title: "Criar landing page",
    description:
      "Gerar a landing page institucional e conectar ao domínio comprado.",
    action: "Criar LP + conectar",
  },
  {
    id: "meta_login",
    title: "Login Meta",
    description:
      "Abrir o perfil Facebook selecionado e autenticar a sessão do Argos.",
    action: "Iniciar login",
  },
  {
    id: "business",
    title: "Criar portfólio empresarial",
    description:
      "Criar o Business Portfolio e persistir o Business ID.",
    action: "Criar portfólio",
  },
  {
    id: "meta_domain",
    title: "Conectar domínio à Meta",
    description:
      "Adicionar, verificar e confirmar o domínio no Business Portfolio.",
    action: "Conectar domínio",
  },
  {
    id: "business_info",
    title: "Preencher Business Info",
    description:
      "Preencher e confirmar os dados empresariais no Business Portfolio da Meta.",
    action: "Preencher Business Info",
  },
  {
    id: "documents",
    title: "Documentação complementar",
    description:
      "Anexar documentos adicionais quando a Meta solicitar verificação.",
    action: "Anexar documentos",
    acceptsFile: true,
  },
  {
    id: "verification",
    title: "Enviar documentação",
    description:
      "Enviar os documentos quando a Meta solicitar Business Verification.",
    action: "Enviar PDFs",
  },
];


function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(
      new Date(value),
    );
  } catch {
    return "--:--";
  }
}


function isDryRunJob(
  job: ArgosJob | null | undefined,
): boolean {
  if (!job) {
    return false;
  }

  return (
    job.status === "dry_run"
    || (
      job.status === "failed"
      && Boolean(
        job.error?.startsWith(
          "DRY_RUN_CONFIRMED",
        ),
      )
    )
  );
}


function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error === "object"
    && error !== null
    && "response" in error
  ) {
    const candidate = error as {
      response?: {
        data?: {
          detail?: unknown;
        };
      };
    };

    const detail =
      candidate.response?.data?.detail;

    if (
      typeof detail === "string"
      && detail
    ) {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages =
        detail
          .map((item) => {
            if (
              typeof item === "object"
              && item !== null
              && "msg" in item
              && typeof item.msg === "string"
            ) {
              return item.msg;
            }

            if (typeof item === "string") {
              return item;
            }

            return null;
          })
          .filter(
            (item): item is string =>
              Boolean(item),
          );

      if (messages.length > 0) {
        return messages.join(" · ");
      }

      return "A API rejeitou os dados enviados.";
    }

    if (
      typeof detail === "object"
      && detail !== null
    ) {
      return "A API rejeitou os dados enviados.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro inesperado.";
}


function normalizeCompanyData(
  source:
    | Partial<ArgosCompanyData>
    | null
    | undefined,
): ArgosCompanyData {
  return {
    cnpj:
      source?.cnpj ?? "",

    razao_social:
      source?.razao_social ?? "",

    nome_fantasia:
      source?.nome_fantasia ?? "",

    data_abertura:
      source?.data_abertura ?? "",

    situacao_cadastral:
      source?.situacao_cadastral ?? "",

    cnae_principal:
      source?.cnae_principal ?? "",

    atividade_principal:
      source?.atividade_principal ?? "",

    natureza_juridica:
      source?.natureza_juridica ?? "",

    logradouro:
      source?.logradouro ?? "",

    numero:
      source?.numero ?? "",

    complemento:
      source?.complemento ?? "",

    bairro:
      source?.bairro ?? "",

    cidade:
      source?.cidade ?? "",

    estado:
      source?.estado ?? "",

    cep:
      source?.cep ?? "",

    email:
      source?.email ?? "",

    telefone:
      source?.telefone ?? "",
  };
}


export default function ArgosPage() {
  const [
    intake,
    setIntake,
  ] = useState<ArgosCnpjIntake | null>(
    null,
  );

  const [
    companyData,
    setCompanyData,
  ] = useState<ArgosCompanyData | null>(
    null,
  );

  const [
    operation,
    setOperation,
  ] = useState<ArgosOperation | null>(
    null,
  );

  const [
    jobs,
    setJobs,
  ] = useState<ArgosJob[]>([]);

  const [
    loadingInitial,
    setLoadingInitial,
  ] = useState(true);

  const [
    uploadingCnpj,
    setUploadingCnpj,
  ] = useState(false);

  const [
    confirmingCnpj,
    setConfirmingCnpj,
  ] = useState(false);

  const [
    decidingLegacy,
    setDecidingLegacy,
  ] = useState(false);

  const [
    queuingDomain,
    setQueuingDomain,
  ] = useState(false);

  const [
    queuingLanding,
    setQueuingLanding,
  ] = useState(false);

  const [
    queuingMetaLogin,
    setQueuingMetaLogin,
  ] = useState(false);

  const [
    selectedDomain,
    setSelectedDomain,
  ] = useState("");

  const [
    uiError,
    setUiError,
  ] = useState<string | null>(null);


  const [
    queuingMetaDomain,
    setQueuingMetaDomain,
  ] = useState(false);

  const [
    queuingBusinessInfo,
    setQueuingBusinessInfo,
  ] = useState(false);


  const refreshOperation =
    useCallback(
      async (
        operationId: string,
      ) => {
        const [
          freshOperation,
          freshJobs,
        ] = await Promise.all([
          getArgosOperation(
            operationId,
          ),
          listArgosJobs(
            operationId,
          ),
        ]);

        setOperation(
          freshOperation,
        );

        setJobs(
          freshJobs,
        );

        setSelectedDomain(
          (current) => {
            const candidates =
              freshOperation.domain_candidates
              ?? [];

            if (
              current
              && candidates.includes(
                current,
              )
            ) {
              return current;
            }

            return candidates[0] ?? "";
          },
        );
      },
      [],
    );


  useEffect(() => {
    async function bootstrap() {
      try {
        const operations =
          await listArgosOperations();

        const latest =
          operations[0];

        if (latest) {
          await refreshOperation(
            latest.id,
          );
        }
      } catch (error) {
        setUiError(
          getErrorMessage(error),
        );
      } finally {
        setLoadingInitial(false);
      }
    }

    bootstrap();
  }, [refreshOperation]);


  const activeDomainJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            (
              job.action
                === "ALLOCATE_SUBDOMAIN"
              || job.action
                === "BUY_DOMAIN"
            )
            && (
              job.status === "queued"
              || job.status === "running"
            ),
        ) ?? null,
      [jobs],
    );


  const activeLegacyJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "RECONCILE_LEGACY"
            && (
              job.status === "queued"
              || job.status === "running"
            ),
        ) ?? null,
      [jobs],
    );


  const latestLegacyJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "RECONCILE_LEGACY"
        ) ?? null,
      [jobs],
    );


  const activeMetaLoginJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "LOGIN_META"
            && (
              job.status === "queued"
              || job.status === "running"
            ),
        ) ?? null,
      [jobs],
    );


  const latestMetaLoginJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "LOGIN_META"
        ) ?? null,
      [jobs],
    );


  const activeMetaDomainJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "META_DOMAIN"
            && (
              job.status === "queued"
              || job.status === "running"
            ),
        ) ?? null,
      [jobs],
    );


  const latestMetaDomainJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "META_DOMAIN"
        ) ?? null,
      [jobs],
    );


  const activeBusinessInfoJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "BUSINESS_INFO"
            && (
              job.status === "queued"
              || job.status === "running"
            ),
        ) ?? null,
      [jobs],
    );


  const latestBusinessInfoJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "BUSINESS_INFO"
        ) ?? null,
      [jobs],
    );


  const legacyBlocksDomain =
    operation
      ?.legacy_reconciliation_status
      === "pending"
    || operation
      ?.legacy_reconciliation_status
      === "candidate";


  const latestDomainJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            (
              job.action
                === "ALLOCATE_SUBDOMAIN"
              || job.action
                === "BUY_DOMAIN"
            )
        ) ?? null,
      [jobs],
    );


  const activeLandingJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "CREATE_LANDING_PAGE"
            && (
              job.status === "queued"
              || job.status === "running"
            ),
        ) ?? null,
      [jobs],
    );


  const latestLandingJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "CREATE_LANDING_PAGE"
        ) ?? null,
      [jobs],
    );


  useEffect(() => {
    if (
      !operation
      || (
        !activeDomainJob
        && !activeLegacyJob
        && !activeLandingJob
      )
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          refreshOperation(
            operation.id,
          ).catch((error) => {
            setUiError(
              getErrorMessage(
                error,
              ),
            );
          });
        },
        2000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    operation,
    activeDomainJob,
    activeLegacyJob,
    activeLandingJob,
    refreshOperation,
  ]);


  useEffect(() => {
    if (
      !operation
      || !activeMetaLoginJob
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          refreshOperation(
            operation.id,
          ).catch((error) => {
            setUiError(
              getErrorMessage(
                error,
              ),
            );
          });
        },
        2000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    operation,
    activeMetaLoginJob,
    refreshOperation,
  ]);


  function resetForNewCompany() {
    setOperation(null);
    setIntake(null);
    setCompanyData(null);
    setJobs([]);
    setSelectedDomain("");
    setUiError(null);
  }


  async function handleCnpjUpload(
    file: File,
  ) {
    if (uploadingCnpj) {
      return;
    }

    setUploadingCnpj(true);
    setUiError(null);

    try {
      const createdIntake =
        await uploadArgosCnpjCard(
          file,
        );

      setIntake(
        createdIntake,
      );

      setCompanyData(
        normalizeCompanyData(
          createdIntake.extracted_data,
        ),
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setUploadingCnpj(false);
    }
  }


  function updateCompanyData(
    field: keyof ArgosCompanyData,
    value: string,
  ) {
    setCompanyData(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [field]: value,
        };
      },
    );
  }


  async function confirmCompany() {
    if (
      !intake
      || !companyData
      || confirmingCnpj
    ) {
      return;
    }

    setConfirmingCnpj(true);
    setUiError(null);

    try {
      const createdOperation =
        await confirmArgosCnpjIntake(
          intake.id,
          companyData,
        );

      await refreshOperation(
        createdOperation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setConfirmingCnpj(false);
    }
  }


  async function decideLegacy(
    decision: "confirm" | "reject",
  ) {
    if (
      !operation
      || decidingLegacy
    ) {
      return;
    }

    setDecidingLegacy(true);
    setUiError(null);

    try {
      await decideArgosLegacyReconciliation(
        operation.id,
        decision,
      );

      await refreshOperation(
        operation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setDecidingLegacy(false);
    }
  }


  async function retryLegacy() {
    if (
      !operation
      || decidingLegacy
      || activeLegacyJob
    ) {
      return;
    }

    setDecidingLegacy(true);
    setUiError(null);

    try {
      await createArgosJob(
        operation.id,
        "RECONCILE_LEGACY",
      );

      await refreshOperation(
        operation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setDecidingLegacy(false);
    }
  }


  async function queueDomainStep() {
    if (
      !operation
      || queuingDomain
      || operation.domain
      || legacyBlocksDomain
    ) {
      return;
    }

    const poolRootRequired =
      latestDomainJob?.action
        === "ALLOCATE_SUBDOMAIN"
      && latestDomainJob.status
        === "failed"
      && Boolean(
        latestDomainJob.error?.includes(
          "DOMAIN_POOL_ROOT_REQUIRED",
        ),
      );

    setQueuingDomain(true);
    setUiError(null);

    try {
      if (!poolRootRequired) {
        await createArgosJob(
          operation.id,
          "ALLOCATE_SUBDOMAIN",
        );
      } else {
        const selected =
          selectedDomain
            .trim()
            .toLowerCase();

        if (!selected) {
          setUiError(
            "Selecione o próximo domínio raiz.",
          );
          return;
        }

        if (
          !operation.domain_candidates.includes(
            selected,
          )
        ) {
          setUiError(
            "O domínio raiz selecionado não "
            + "pertence aos candidatos autorizados.",
          );
          return;
        }

        await createArgosJob(
          operation.id,
          "BUY_DOMAIN",
          selected,
        );
      }

      await refreshOperation(
        operation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setQueuingDomain(false);
    }
  }


  async function queueLandingPage() {
    if (
      !operation
      || queuingLanding
      || activeLandingJob
      || !operation.domain
      || operation.site_url
      || legacyBlocksDomain
    ) {
      return;
    }

    setQueuingLanding(true);
    setUiError(null);

    try {
      await createArgosJob(
        operation.id,
        "CREATE_LANDING_PAGE",
      );

      await refreshOperation(
        operation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setQueuingLanding(false);
    }
  }


  async function queueMetaLogin() {
    if (
      !operation
      || queuingMetaLogin
      || activeMetaLoginJob
      || operation.current_step
        === "META_LOGGED_IN"
    ) {
      return;
    }

    if (
      operation.current_step
        !== "LANDING_CREATED"
      || !operation.site_url
    ) {
      setUiError(
        "A landing page precisa estar "
        + "concluída antes do Login Meta.",
      );
      return;
    }

    setQueuingMetaLogin(true);
    setUiError(null);

    try {
      await createArgosJob(
        operation.id,
        "LOGIN_META",
      );

      await refreshOperation(
        operation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setQueuingMetaLogin(false);
    }
  }


  async function queueMetaDomain() {
    if (
      !operation
      || queuingMetaDomain
      || activeMetaDomainJob
      || operation.current_step
        === "META_DOMAIN_VERIFIED"
      || operation.current_step
        === "DOMAIN_VERIFIED"
    ) {
      return;
    }

    if (
      operation.current_step
        !== "BUSINESS_CREATED"
      || !operation.business_id
      || !operation.domain
      || !operation.site_url
    ) {
      setUiError(
        "O Business Portfolio, domínio e "
        + "landing page precisam estar "
        + "concluídos antes de conectar "
        + "o domínio à Meta.",
      );
      return;
    }

    setQueuingMetaDomain(true);
    setUiError(null);

    try {
      await createArgosJob(
        operation.id,
        "META_DOMAIN",
      );

      await refreshOperation(
        operation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setQueuingMetaDomain(false);
    }
  }


  useEffect(() => {
    if (
      !operation
      || !activeMetaDomainJob
    ) {
      return;
    }

    const timer = window.setInterval(
      () => {
        void refreshOperation(
          operation.id,
        );
      },
      1500,
    );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    activeMetaDomainJob,
    operation,
    refreshOperation,
  ]);


  async function queueBusinessInfo() {
    if (
      !operation
      || queuingBusinessInfo
      || activeBusinessInfoJob
      || operation.current_step
        === "BUSINESS_INFO_COMPLETE"
    ) {
      return;
    }

    if (
      (
        operation.current_step
          !== "META_DOMAIN_VERIFIED"
        && operation.current_step
          !== "DOMAIN_VERIFIED"
      )
      || !operation.business_id
    ) {
      setUiError(
        "O domínio precisa estar "
        + "verificado na Meta antes "
        + "do Business Info.",
      );
      return;
    }

    setQueuingBusinessInfo(true);
    setUiError(null);

    try {
      await createArgosJob(
        operation.id,
        "BUSINESS_INFO",
      );

      await refreshOperation(
        operation.id,
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setQueuingBusinessInfo(false);
    }
  }


  useEffect(() => {
    if (
      !operation
      || !activeBusinessInfoJob
    ) {
      return;
    }

    const timer = window.setInterval(
      () => {
        void refreshOperation(
          operation.id,
        );
      },
      1500,
    );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    activeBusinessInfoJob,
    operation,
    refreshOperation,
  ]);


  function domainStatus():
    ArgosStepStatus {
    if (!operation) {
      return "locked";
    }

    if (
      operation.current_step
        === "DOMAIN_PURCHASED"
      || operation.domain
    ) {
      return "done";
    }

    if (legacyBlocksDomain) {
      return "locked";
    }

    if (
      activeDomainJob
      || queuingDomain
    ) {
      return "running";
    }

    if (
      isDryRunJob(
        latestDomainJob,
      )
    ) {
      return "test";
    }

    if (
      latestDomainJob?.status
        === "failed"
    ) {
      return "error";
    }

    return "ready";
  }


  function landingStatus():
    ArgosStepStatus {
    if (
      !operation
      || !operation.domain
      || legacyBlocksDomain
    ) {
      return "locked";
    }

    if (
      operation.site_url
      || operation.current_step
        === "LANDING_CREATED"
    ) {
      return "done";
    }

    if (
      activeLandingJob
      || queuingLanding
    ) {
      return "running";
    }

    if (
      latestLandingJob?.status
        === "failed"
    ) {
      return "error";
    }

    return "ready";
  }


  function metaLoginStatus():
    ArgosStepStatus {
    if (!operation) {
      return "locked";
    }

    if (
      latestMetaLoginJob?.status
        === "succeeded"
      || operation.current_step
        === "META_LOGGED_IN"
      || operation.current_step
        === "BUSINESS_CREATED"
      || Boolean(operation.business_id)
    ) {
      return "done";
    }

    if (
      activeMetaLoginJob
      || queuingMetaLogin
    ) {
      return "running";
    }

    if (
      latestMetaLoginJob?.status
        === "failed"
    ) {
      return "error";
    }

    if (
      operation.current_step
        !== "LANDING_CREATED"
      || !operation.site_url
    ) {
      return "locked";
    }

    return "ready";
  }


  function businessStatus():
    ArgosStepStatus {
    if (!operation) {
      return "locked";
    }

    if (operation.business_id) {
      return "done";
    }

    if (
      metaLoginStatus()
      === "done"
    ) {
      return "ready";
    }

    return "locked";
  }


  function metaDomainStatus():
    ArgosStepStatus {
    if (!operation) {
      return "locked";
    }

    if (
      operation.current_step
        === "META_DOMAIN_VERIFIED"
      || operation.current_step
        === "DOMAIN_VERIFIED"
    ) {
      return "done";
    }

    if (!operation.business_id) {
      return "locked";
    }

    return "ready";
  }


  function businessInfoStatus():
    ArgosStepStatus {
    if (!operation) {
      return "locked";
    }

    if (
      operation.current_step
        === "BUSINESS_INFO_COMPLETE"
      || operation.current_step
        === "BUSINESS_VERIFICATION_REVIEW"
      || operation.current_step
        === "BUSINESS_VERIFIED"
      || operation.current_step
        === "HARDT_ADMIN_ACCESS_PENDING"
      || operation.current_step
        === "HARDT_ADMIN_ACCESS_INVITED"
      || operation.current_step
        === "HARDT_ADMIN_ACCESS_COMPLETE"
    ) {
      return "done";
    }

    if (
      activeBusinessInfoJob
      || queuingBusinessInfo
    ) {
      return "running";
    }

    if (
      latestBusinessInfoJob?.status
        === "failed"
    ) {
      return "error";
    }

    if (
      operation.current_step
        === "META_DOMAIN_VERIFIED"
      || operation.current_step
        === "DOMAIN_VERIFIED"
    ) {
      return "ready";
    }

    return "locked";
  }


  function documentsStatus():
    ArgosStepStatus {
    if (!operation) {
      return "locked";
    }

    if (
      operation.current_step
        === "BUSINESS_VERIFICATION_REVIEW"
      || operation.current_step
        === "BUSINESS_VERIFIED"
      || operation.current_step
        === "HARDT_ADMIN_ACCESS_PENDING"
      || operation.current_step
        === "HARDT_ADMIN_ACCESS_INVITED"
      || operation.current_step
        === "HARDT_ADMIN_ACCESS_COMPLETE"
    ) {
      return "done";
    }

    if (
      operation.current_step
        === "BUSINESS_INFO_COMPLETE"
    ) {
      return "ready";
    }

    return "locked";
  }


  function statusForStep(
    stepId: string,
  ): ArgosStepStatus {
    if (stepId === "domain") {
      return domainStatus();
    }

    if (stepId === "landing") {
      return landingStatus();
    }

    if (
      stepId === "meta_login"
    ) {
      return metaLoginStatus();
    }

    if (
      stepId === "business"
    ) {
      return businessStatus();
    }

    if (
      stepId === "meta_domain"
    ) {
      return metaDomainStatus();
    }

    if (
      stepId === "business_info"
    ) {
      return businessInfoStatus();
    }

    if (
      stepId === "documents"
    ) {
      return documentsStatus();
    }

    return "locked";
  }


  function detailForStep(
    stepId: string,
  ): string | undefined {
    if (!operation) {
      return undefined;
    }


    if (
      stepId === "meta_login"
    ) {
      if (
        latestMetaLoginJob?.status
          === "succeeded"
        || operation.current_step
          === "META_LOGGED_IN"
        || operation.current_step
          === "BUSINESS_CREATED"
        || Boolean(operation.business_id)
      ) {
        return "Sessão Meta autenticada.";
      }

      if (
        activeMetaLoginJob?.status
          === "queued"
      ) {
        return (
          "LOGIN_META está na fila. "
          + "Aguardando Argos Agent."
        );
      }

      if (
        activeMetaLoginJob?.status
          === "running"
      ) {
        return (
          "Argos Agent está autenticando "
          + "o perfil Meta reservado."
        );
      }

      if (
        latestMetaLoginJob?.status
          === "failed"
      ) {
        return (
          latestMetaLoginJob.error
          || "O Login Meta falhou."
        );
      }

      if (
        operation.current_step
          !== "LANDING_CREATED"
      ) {
        return (
          "Aguardando conclusão "
          + "da landing page."
        );
      }

      return (
        "Perfil Meta será reservado "
        + "automaticamente pelo Argos."
      );
    }

    if (stepId === "landing") {
      if (operation.site_url) {
        return (
          "Landing publicada: "
          + operation.site_url
        );
      }

      if (!operation.domain) {
        return (
          "Aguardando conclusão do domínio."
        );
      }

      if (
        activeLandingJob?.status
          === "queued"
      ) {
        return (
          "CREATE_LANDING_PAGE está na fila. "
          + "Aguardando Argos Agent."
        );
      }

      if (
        activeLandingJob?.status
          === "running"
      ) {
        return (
          "Argos Agent está publicando "
          + "a landing pelo motor existente."
        );
      }

      if (
        latestLandingJob?.status
          === "failed"
      ) {
        return (
          latestLandingJob.error
          || "A publicação da landing falhou."
        );
      }

      return (
        "Pronto para publicar em https://"
        + operation.domain
        + "."
      );
    }

    if (stepId !== "domain") {
      if (
      stepId === "business"
    ) {
      if (operation.business_id) {
        return (
          "Business Portfolio criado. "
          + "Business ID: "
          + operation.business_id
        );
      }

      return (
        "Aguardando conclusão "
        + "do Login Meta."
      );
    }


    if (
      stepId === "meta_domain"
    ) {
      if (!operation.business_id) {
        return (
          "Aguardando criação "
          + "do Business Portfolio."
        );
      }

      return (
        "Business ID "
        + operation.business_id
        + " pronto para conectar "
        + "o domínio à Meta."
      );
    }


    if (
      stepId === "business_info"
    ) {
      if (
        operation.current_step
          === "BUSINESS_INFO_COMPLETE"
        || operation.current_step
          === "BUSINESS_VERIFICATION_REVIEW"
        || operation.current_step
          === "BUSINESS_VERIFIED"
        || operation.current_step
          === "HARDT_ADMIN_ACCESS_PENDING"
        || operation.current_step
          === "HARDT_ADMIN_ACCESS_INVITED"
        || operation.current_step
          === "HARDT_ADMIN_ACCESS_COMPLETE"
      ) {
        return (
          "Business Info preenchido "
          + "e confirmado na Meta."
        );
      }

      if (
        activeBusinessInfoJob?.status
          === "queued"
      ) {
        return (
          "BUSINESS_INFO está na fila. "
          + "Aguardando Argos Agent."
        );
      }

      if (
        activeBusinessInfoJob?.status
          === "running"
      ) {
        return (
          "Argos Agent está preenchendo "
          + "o Business Info."
        );
      }

      if (
        latestBusinessInfoJob?.status
          === "failed"
      ) {
        return (
          latestBusinessInfoJob.error
          || "Falha ao preencher Business Info."
        );
      }

      if (
        operation.current_step
          === "META_DOMAIN_VERIFIED"
        || operation.current_step
          === "DOMAIN_VERIFIED"
      ) {
        return (
          "Domínio Meta verificado. "
          + "Business ID "
          + operation.business_id
          + " pronto para Business Info."
        );
      }

      return (
        "Aguardando verificação "
        + "do domínio na Meta."
      );
    }


    if (
      stepId === "documents"
    ) {
      if (
        operation.current_step
          === "BUSINESS_INFO_COMPLETE"
      ) {
        return (
          "Business Info concluído. "
          + "Documentação liberada."
        );
      }

      return (
        "Aguardando conclusão "
        + "do Business Info."
      );
    }


    return undefined;
    }

    if (operation.domain) {
      return (
        "Domínio confirmado: "
        + operation.domain
      );
    }

    if (
      activeDomainJob?.status
        === "queued"
    ) {
      return (
        "Provisionamento do endereço web está na fila. "
        + "Aguardando Argos Agent."
      );
    }

    if (
      activeDomainJob?.status
        === "running"
    ) {
      return (
        "Argos Agent assumiu o comando "
        + "e está executando a compra."
      );
    }

    if (
      isDryRunJob(
        latestDomainJob,
      )
    ) {
      return (
        "🧪 Teste concluído. "
        + "O Argos Agent recebeu e validou "
        + "o comando; nenhuma compra foi "
        + "realizada."
      );
    }

    if (
      latestDomainJob?.status
        === "failed"
    ) {
      return (
        latestDomainJob.error
        || "A compra falhou."
      );
    }

    return (
      "Candidatos: "
      + operation.domain_candidates.join(
        " · ",
      )
    );
  }


  const logs =
    useMemo<ArgosLogEntry[]>(
      () => {
        const entries: ArgosLogEntry[] =
          [];

        if (operation) {
          entries.push({
            id:
              `operation-${operation.id}`,
            time: formatTime(
              operation.created_at,
            ),
            message:
              `Operação criada para `
              + operation.company_name
              + ".",
          });
        }

        for (const job of jobs) {
          let message =
            `${job.action}: `
            + job.status;

          if (
            job.status === "succeeded"
            && job.result?.domain
          ) {
            message =
              `Domínio confirmado: `
              + String(
                job.result.domain,
              );
          }

          if (
            isDryRunJob(job)
          ) {
            message =
              `🧪 ${job.action}: `
              + "teste concluído; "
              + "nenhuma ação externa executada.";
          } else if (
            job.status === "failed"
          ) {
            message =
              `${job.action} falhou: `
              + (
                job.error
                || "erro desconhecido"
              );
          }

          entries.push({
            id: job.id,
            time: formatTime(
              job.created_at,
            ),
            message,
          });
        }

        return entries.sort(
          (a, b) =>
            b.time.localeCompare(
              a.time,
            ),
        );
      },
      [
        operation,
        jobs,
      ],
    );


  if (loadingInitial) {
    return (
      <main className="min-h-full bg-[#09090b] p-8 text-zinc-400">
        Carregando Argos...
      </main>
    );
  }


  return (
    <main className="min-h-full bg-[#09090b] text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">

        <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Somente Admin
              </span>

              <span className="text-xs text-zinc-600">
                Argos Control Plane
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Argos
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              Operação assistida para infraestrutura,
              Business Portfolio e verificação
              empresarial na Meta.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
            <div className="px-5 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                Operação
              </div>

              <div className="mt-1 text-lg font-semibold">
                {operation ? "1" : "0"}
              </div>
            </div>

            <div className="border-l border-white/10 px-5 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                Na fila
              </div>

              <div className="mt-1 text-lg font-semibold">
                {
                  jobs.filter(
                    (job) =>
                      job.status
                        === "queued",
                  ).length
                }
              </div>
            </div>

            <div className="border-l border-white/10 px-5 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                Concluídas
              </div>

              <div className="mt-1 text-lg font-semibold">
                {
                  jobs.filter(
                    (job) =>
                      job.status
                        === "succeeded",
                  ).length
                }
              </div>
            </div>
          </div>
        </header>


        {uiError && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {uiError}
          </div>
        )}


        {!operation && (
          <CnpjIntakeCard
            intake={intake}
            companyData={companyData}
            uploading={uploadingCnpj}
            confirming={confirmingCnpj}
            onFileSelected={
              handleCnpjUpload
            }
            onCompanyDataChange={
              updateCompanyData
            }
            onConfirm={
              confirmCompany
            }
          />
        )}


        {operation && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={
                Boolean(
                  activeDomainJob
                  || activeLegacyJob
                )
              }
              onClick={
                resetForNewCompany
              }
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Nova empresa
            </button>
          </div>
        )}


        {operation && (
          <section className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Client slug
                </div>

                <div className="mt-1 text-sm text-zinc-300">
                  {operation.client_slug}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Estado
                </div>

                <div className="mt-1 text-sm text-zinc-300">
                  {operation.current_step}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Domínio
                </div>

                <div className="mt-1 text-sm text-zinc-300">
                  {
                    operation.domain
                    || "Ainda não comprado"
                  }
                </div>
              </div>
            </div>

            {operation.last_message && (
              <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-zinc-500">
                {
                  operation.last_message.includes(
                    "DRY_RUN_CONFIRMED",
                  )
                    ? (
                      "🧪 Teste concluído: "
                      + "nenhuma ação externa "
                      + "foi executada."
                    )
                    : operation.last_message
                }
              </div>
            )}
          </section>
        )}


        {operation && (
          <LegacyReconciliationCard
            operation={operation}
            job={latestLegacyJob}
            deciding={decidingLegacy}
            onDecision={decideLegacy}
            onRetry={retryLegacy}
          />
        )}


        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">

          <section className="space-y-3">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-semibold">
                  Workflow
                </h2>

                <p className="mt-1 text-sm text-zinc-600">
                  O backend é a fonte de verdade do estado.
                </p>
              </div>

              <div className="text-xs text-zinc-600">
                8 etapas
              </div>
            </div>


            {workflow.map(
              (step, index) => {
                const status =
                  statusForStep(
                    step.id,
                  );

                const isDomain =
                  step.id === "domain";

                return (
                  <div
                    key={step.id}
                    className="space-y-3"
                  >
                    {
                      isDomain
                      && operation
                      && !operation.domain
                      && !legacyBlocksDomain
                      && (
                        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-5">
                          <div className="text-sm font-semibold text-white">
                            Escolha o domínio que será registrado
                          </div>

                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            O Argos comprará somente o domínio selecionado.
                            Os outros são apenas alternativas e não serão cobrados.
                          </p>

                          <div className="mt-4 space-y-2">
                            {
                              operation.domain_candidates.map(
                                (candidate) => (
                                  <label
                                    key={candidate}
                                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 transition hover:border-violet-500/30"
                                  >
                                    <input
                                      type="radio"
                                      name="argos-domain"
                                      value={candidate}
                                      checked={
                                        selectedDomain
                                        === candidate
                                      }
                                      disabled={
                                        Boolean(
                                          activeDomainJob,
                                        )
                                        || queuingDomain
                                      }
                                      onChange={() => {
                                        setSelectedDomain(
                                          candidate,
                                        );
                                        setUiError(null);
                                      }}
                                      className="h-4 w-4"
                                    />

                                    <span className="text-sm text-zinc-300">
                                      {candidate}
                                    </span>
                                  </label>
                                ),
                              )
                            }
                          </div>

                          <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-xs text-zinc-400">
                            Será comprado:{" "}
                            <span className="font-semibold text-violet-300">
                              {
                                selectedDomain
                                || "nenhum domínio selecionado"
                              }
                            </span>
                            {" · "}Máximo autorizado: US$ 15
                            {" · "}Quantidade: 1 domínio
                          </div>
                        </div>
                      )
                    }

                    <WorkflowStep
                      number={
                        index + 1
                      }
                      title={
                        step.title
                      }
                      description={
                        step.description
                      }
                      action={
                        isDomain
                          ? (
                            activeDomainJob
                              ? "Executando..."
                              : (
                                selectedDomain
                                  ? "Comprar domínio selecionado"
                                  : "Selecione um domínio"
                              )
                          )
                          : step.action
                      }
                      status={
                        status
                      }
                      acceptsFile={
                        step.acceptsFile
                      }
                      detail={
                        detailForStep(
                          step.id,
                        )
                      }
                      onAction={
                        step.id === "meta_login"
                          ? queueMetaLogin
                          : step.id === "meta_domain"
                            ? queueMetaDomain
                            : step.id === "business_info"
                              ? queueBusinessInfo
                              : (
                            isDomain
                                                      ? queueDomainStep
                                                      : (
                                                        step.id === "landing"
                                                          ? queueLandingPage
                                                          : undefined
                                                      )
                          )
                      }
                    />
                  </div>
                );
              },
            )}


            <article className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5">
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-sm font-semibold text-amber-300">
                  9
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold text-white">
                      Análise da Meta
                    </h3>

                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Bloqueado
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Após o envio dos documentos,
                    o fluxo termina aguardando
                    análise da Meta.
                  </p>
                </div>
              </div>
            </article>
          </section>


          <div className="space-y-6">
            <ActivityLog
              entries={logs}
            />

            {operation && (
              <aside className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Domínios candidatos
                </div>

                <div className="mt-4 space-y-2">
                  {
                    operation
                      .domain_candidates
                      .map(
                        (domain) => (
                          <div
                            key={domain}
                            className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-sm text-zinc-400"
                          >
                            {domain}
                          </div>
                        ),
                      )
                  }
                </div>
              </aside>
            )}


            <aside className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Checkpoints humanos
              </div>

              <div className="mt-4 space-y-3 text-sm text-zinc-500">
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  2FA da Meta
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  CAPTCHA
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  Confirmação de identidade
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  Revisão de documentos
                </div>
              </div>
            </aside>
          </div>

        </div>
      </div>
    </main>
  );
}
