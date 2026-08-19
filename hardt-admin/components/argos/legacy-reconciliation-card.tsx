"use client";

import {
  type ArgosJob,
  type ArgosOperation,
} from "@/lib/api/client-argos";


type Props = {
  operation: ArgosOperation;
  job: ArgosJob | null;
  deciding: boolean;

  onDecision: (
    decision: "confirm" | "reject",
  ) => void;

  onRetry: () => void;
};


function evidenceString(
  operation: ArgosOperation,
  key: string,
): string | null {
  const value =
    operation
      .legacy_evidence?.[key];

  return (
    typeof value === "string"
    && value.trim()
  )
    ? value.trim()
    : null;
}


export function LegacyReconciliationCard({
  operation,
  job,
  deciding,
  onDecision,
  onRetry,
}: Props) {
  const status =
    operation
      .legacy_reconciliation_status;

  if (!status) {
    return null;
  }

  const domain =
    evidenceString(
      operation,
      "domain",
    );

  const domainProven =
    operation
      .legacy_evidence
      ?.[
        "domain_proven"
      ] === true;

  const source =
    operation.legacy_source
    || "fonte legada";


  if (status === "pending") {
    const failed =
      job?.status === "failed";

    return (
      <section className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
          Reconciliação de histórico
        </div>

        <h3 className="mt-2 font-semibold text-white">
          {
            failed
              ? "A busca pelo legado falhou"
              : "Procurando histórico anterior"
          }
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {
            failed
              ? (
                job?.error
                || "O worker não concluiu a busca."
              )
              : (
                "O domínio fica bloqueado até "
                + "o Argos verificar se esta "
                + "empresa já possui infraestrutura."
              )
          }
        </p>

        {failed && (
          <button
            type="button"
            disabled={deciding}
            onClick={onRetry}
            className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.09] hover:text-white disabled:opacity-30"
          >
            Tentar novamente
          </button>
        )}
      </section>
    );
  }


  if (status === "candidate") {
    return (
      <section className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
          Histórico legado encontrado
        </div>

        <h3 className="mt-2 font-semibold text-white">
          Confirme antes de reutilizar
        </h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600">
              Fonte
            </div>

            <div className="mt-1 text-sm text-zinc-300">
              {source}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600">
              Domínio encontrado
            </div>

            <div className="mt-1 text-sm text-zinc-300">
              {
                domain
                || "Nenhum"
              }
            </div>

            {domain && (
              <div className="mt-1 text-xs text-zinc-600">
                {
                  domainProven
                    ? "Evidência de compra encontrada"
                    : "Compra não comprovada"
                }
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Nada será aplicado automaticamente.
          Associar histórico reutiliza somente
          artefatos explicitamente marcados
          como comprovados pelo worker.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={deciding}
            onClick={() => {
              onDecision(
                "confirm",
              );
            }}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-30"
          >
            {
              deciding
                ? "Processando..."
                : "Associar histórico"
            }
          </button>

          <button
            type="button"
            disabled={deciding}
            onClick={() => {
              onDecision(
                "reject",
              );
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
          >
            Ignorar histórico
          </button>
        </div>
      </section>
    );
  }


  if (status === "confirmed") {
    return (
      <section className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Histórico associado
        </div>

        <p className="mt-2 text-sm text-zinc-400">
          {
            operation.domain
              ? (
                "Domínio legado confirmado: "
                + operation.domain
              )
              : (
                "Histórico confirmado sem "
                + "domínio reutilizável."
              )
          }
        </p>
      </section>
    );
  }


  if (status === "not_found") {
    return (
      <section className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="text-sm font-semibold text-zinc-300">
          Nenhum histórico legado encontrado
        </div>

        <p className="mt-1 text-xs text-zinc-600">
          A compra de domínio está liberada.
        </p>
      </section>
    );
  }


  if (status === "rejected") {
    return (
      <section className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="text-sm font-semibold text-zinc-300">
          Histórico legado ignorado
        </div>

        <p className="mt-1 text-xs text-zinc-600">
          Nenhum artefato antigo foi aplicado.
          A compra de domínio está liberada.
        </p>
      </section>
    );
  }


  return null;
}
