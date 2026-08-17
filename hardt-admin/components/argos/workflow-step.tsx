"use client";

export type ArgosStepStatus =
  | "locked"
  | "ready"
  | "running"
  | "done"
  | "human"
  | "waiting"
  | "error";

type WorkflowStepProps = {
  number: number;
  title: string;
  description: string;
  action: string;
  status: ArgosStepStatus;
  detail?: string;
  acceptsFile?: boolean;
  onAction?: () => void;
};

const statusConfig: Record<
  ArgosStepStatus,
  {
    label: string;
    className: string;
  }
> = {
  locked: {
    label: "Bloqueado",
    className:
      "border-white/10 bg-white/[0.03] text-zinc-500",
  },
  ready: {
    label: "Pronto",
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },
  running: {
    label: "Executando",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  done: {
    label: "Concluído",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  human: {
    label: "Ação humana",
    className:
      "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },
  waiting: {
    label: "Aguardando Meta",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  error: {
    label: "Erro",
    className:
      "border-red-500/20 bg-red-500/10 text-red-300",
  },
};

export function WorkflowStep({
  number,
  title,
  description,
  action,
  status,
  detail,
  acceptsFile = false,
  onAction,
}: WorkflowStepProps) {
  const config = statusConfig[status];

  const disabled =
    status === "locked" ||
    status === "running" ||
    status === "done" ||
    status === "waiting";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/[0.16]">
      <div className="flex gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm font-semibold text-zinc-300">
          {number}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-white">
                {title}
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                {description}
              </p>
            </div>

            <span
              className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${config.className}`}
            >
              {config.label}
            </span>
          </div>

          {detail && (
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-zinc-400">
              {detail}
            </div>
          )}

          {acceptsFile && (
            <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
              <div className="text-sm font-medium text-zinc-300">
                Documentação da empresa
              </div>

              <div className="mt-1 text-xs text-zinc-600">
                PDF da Receita Federal e documentos
                complementares.
              </div>

              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                disabled={status === "locked"}
                className="mt-3 block w-full text-xs text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-200"
              />
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={onAction}
              className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {action}
            </button>

            {status === "human" && (
              <span className="text-xs text-violet-300">
                CAPTCHA / 2FA / confirmação manual
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
