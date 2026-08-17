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
import { CompanyHeader } from "@/components/argos/company-header";
import {
  WorkflowStep,
  type ArgosStepStatus,
} from "@/components/argos/workflow-step";

import {
  createArgosJob,
  createArgosOperation,
  getArgosOperation,
  listArgosJobs,
  listArgosOperations,
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
    title: "Comprar domínio",
    description:
      "Consulta os candidatos e registra o primeiro domínio disponível dentro do teto configurado no Argos.",
    action: "Comprar domínio",
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
    id: "documents",
    title: "Ler documentação",
    description:
      "Receber os PDFs e extrair os dados empresariais.",
    action: "Processar PDFs",
    acceptsFile: true,
  },
  {
    id: "business_info",
    title: "Preencher dados da empresa",
    description:
      "Preencher os dados empresariais solicitados pela Meta.",
    action: "Preencher dados",
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


function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object"
    && error !== null
    && "response" in error
  ) {
    const candidate = error as {
      response?: {
        data?: {
          detail?: string;
        };
      };
    };

    const detail =
      candidate.response?.data?.detail;

    if (detail) {
      return detail;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro inesperado.";
}


export default function ArgosPage() {
  const [
    companyName,
    setCompanyName,
  ] = useState("");

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
    creatingOperation,
    setCreatingOperation,
  ] = useState(false);

  const [
    queuingDomain,
    setQueuingDomain,
  ] = useState(false);

  const [
    selectedDomain,
    setSelectedDomain,
  ] = useState("");

  const [
    uiError,
    setUiError,
  ] = useState<string | null>(null);


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

        setCompanyName(
          freshOperation.company_name,
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
            job.action
              === "BUY_DOMAIN"
            && (
              job.status === "queued"
              || job.status === "running"
            ),
        ) ?? null,
      [jobs],
    );


  const latestDomainJob =
    useMemo(
      () =>
        jobs.find(
          (job) =>
            job.action
              === "BUY_DOMAIN"
        ) ?? null,
      [jobs],
    );


  useEffect(() => {
    if (
      !operation
      || !activeDomainJob
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
    refreshOperation,
  ]);


  async function startOperation() {
    const normalized =
      companyName.trim();

    if (
      normalized.length < 2
      || creatingOperation
    ) {
      return;
    }

    setCreatingOperation(true);
    setUiError(null);

    try {
      const created =
        await createArgosOperation(
          normalized,
        );

      setOperation(created);
      setCompanyName(
        created.company_name,
      );
      setJobs([]);

      setSelectedDomain(
        created.domain_candidates[0]
        ?? "",
      );
    } catch (error) {
      setUiError(
        getErrorMessage(error),
      );
    } finally {
      setCreatingOperation(false);
    }
  }


  async function queueDomainPurchase() {
    if (
      !operation
      || queuingDomain
      || operation.domain
    ) {
      return;
    }

    const selected =
      selectedDomain.trim().toLowerCase();

    if (!selected) {
      setUiError(
        "Selecione o domínio que deseja comprar.",
      );
      return;
    }

    if (
      !operation.domain_candidates.includes(
        selected,
      )
    ) {
      setUiError(
        "O domínio selecionado não pertence "
        + "aos candidatos autorizados.",
      );
      return;
    }

    setQueuingDomain(true);
    setUiError(null);

    try {
      await createArgosJob(
        operation.id,
        "BUY_DOMAIN",
        selected,
      );

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


  function statusForStep(
    stepId: string,
  ): ArgosStepStatus {
    if (stepId === "domain") {
      return domainStatus();
    }

    return "locked";
  }


  function detailForStep(
    stepId: string,
  ): string | undefined {
    if (stepId !== "domain") {
      return undefined;
    }

    if (!operation) {
      return undefined;
    }

    if (operation.domain) {
      return (
        `Domínio confirmado: `
        + operation.domain
      );
    }

    if (
      activeDomainJob?.status
        === "queued"
    ) {
      return (
        "Comando BUY_DOMAIN está na fila. "
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


        <CompanyHeader
          companyName={companyName}
          onCompanyNameChange={
            setCompanyName
          }
          operationStarted={
            Boolean(operation)
          }
          onStart={
            startOperation
          }
        />

        {operation && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={
                Boolean(activeDomainJob)
              }
              onClick={() => {
                setOperation(null);
                setCompanyName("");
                setJobs([]);
                setSelectedDomain("");
                setUiError(null);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Nova operação
            </button>
          </div>
        )}


        {creatingOperation && (
          <div className="mt-3 text-sm text-zinc-500">
            Criando operação...
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
                        isDomain
                          ? queueDomainPurchase
                          : undefined
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
