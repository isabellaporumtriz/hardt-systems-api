"use client";

import { useMemo, useState } from "react";

import {
  ActivityLog,
  type ArgosLogEntry,
} from "@/components/argos/activity-log";
import { CompanyHeader } from "@/components/argos/company-header";
import {
  WorkflowStep,
  type ArgosStepStatus,
} from "@/components/argos/workflow-step";

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
      "Escolher, registrar e salvar o domínio que será utilizado pela empresa.",
    action: "Comprar domínio",
  },
  {
    id: "landing",
    title: "Criar landing page",
    description:
      "Gerar a landing page institucional genérica, publicar e conectar ao domínio comprado.",
    action: "Criar LP + conectar",
  },
  {
    id: "meta_login",
    title: "Login Meta",
    description:
      "Abrir o perfil Facebook selecionado e autenticar a sessão utilizada pelo Argos.",
    action: "Iniciar login",
  },
  {
    id: "business",
    title: "Criar portfólio empresarial",
    description:
      "Criar o Business Portfolio da empresa e persistir o Business ID.",
    action: "Criar portfólio",
  },
  {
    id: "meta_domain",
    title: "Conectar domínio à Meta",
    description:
      "Adicionar o domínio ao portfólio, instalar a verificação necessária e confirmar o domínio.",
    action: "Conectar domínio",
  },
  {
    id: "documents",
    title: "Ler documentação",
    description:
      "Receber os PDFs da empresa e extrair os dados necessários para o cadastro empresarial.",
    action: "Processar PDFs",
    acceptsFile: true,
  },
  {
    id: "business_info",
    title: "Preencher dados da empresa",
    description:
      "Preencher razão social, CNPJ, endereço, website e demais dados solicitados pela Meta.",
    action: "Preencher dados",
  },
  {
    id: "verification",
    title: "Enviar documentação",
    description:
      "Enviar os documentos exigidos pela verificação empresarial quando a Meta solicitar.",
    action: "Enviar PDFs",
  },
];

function currentTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export default function ArgosPage() {
  const [companyName, setCompanyName] =
    useState("");

  const [operationStarted, setOperationStarted] =
    useState(false);

  const [logs, setLogs] = useState<
    ArgosLogEntry[]
  >([]);

  const statuses = useMemo(() => {
    const result: Record<
      string,
      ArgosStepStatus
    > = {};

    workflow.forEach((step, index) => {
      if (!operationStarted) {
        result[step.id] = "locked";
        return;
      }

      result[step.id] =
        index === 0 ? "ready" : "locked";
    });

    return result;
  }, [operationStarted]);

  function addLog(message: string) {
    setLogs((current) => [
      {
        id: crypto.randomUUID(),
        time: currentTime(),
        message,
      },
      ...current,
    ]);
  }

  function startOperation() {
    const normalized =
      companyName.trim();

    if (!normalized) {
      return;
    }

    setCompanyName(normalized);
    setOperationStarted(true);

    addLog(
      `Operação criada para ${normalized}.`,
    );
  }

  function backendPending(
    step: StepDefinition,
  ) {
    addLog(
      `${step.title}: comando preparado no front. Aguardando conexão com o backend Argos.`,
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
                Operações
              </div>
              <div className="mt-1 text-lg font-semibold">
                {operationStarted ? 1 : 0}
              </div>
            </div>

            <div className="border-l border-white/10 px-5 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                Aguardando
              </div>
              <div className="mt-1 text-lg font-semibold">
                0
              </div>
            </div>

            <div className="border-l border-white/10 px-5 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                Concluídas
              </div>
              <div className="mt-1 text-lg font-semibold">
                0
              </div>
            </div>
          </div>
        </header>

        <CompanyHeader
          companyName={companyName}
          onCompanyNameChange={setCompanyName}
          operationStarted={operationStarted}
          onStart={startOperation}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-3">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-semibold">
                  Workflow
                </h2>

                <p className="mt-1 text-sm text-zinc-600">
                  Uma etapa por vez. O backend será
                  a fonte de verdade do estado.
                </p>
              </div>

              <div className="text-xs text-zinc-600">
                8 etapas
              </div>
            </div>

            {workflow.map((step, index) => (
              <WorkflowStep
                key={step.id}
                number={index + 1}
                title={step.title}
                description={step.description}
                action={step.action}
                status={statuses[step.id]}
                acceptsFile={step.acceptsFile}
                detail={
                  statuses[step.id] === "ready"
                    ? "Frontend preparado. Nenhuma automação será executada até conectarmos o Argos."
                    : undefined
                }
                onAction={() =>
                  backendPending(step)
                }
              />
            ))}

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
                    Após envio e confirmação dos documentos,
                    o fluxo termina em aguardando análise da
                    Meta até aprovação ou retorno.
                  </p>
                </div>
              </div>
            </article>
          </section>

          <div className="space-y-6">
            <ActivityLog entries={logs} />

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
