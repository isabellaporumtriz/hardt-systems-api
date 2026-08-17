"use client";

type CompanyHeaderProps = {
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  operationStarted: boolean;
  onStart: () => void;
};

export function CompanyHeader({
  companyName,
  onCompanyNameChange,
  operationStarted,
  onStart,
}: CompanyHeaderProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Operação atual
          </div>

          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Empresa
          </label>

          <input
            value={companyName}
            onChange={(event) =>
              onCompanyNameChange(event.target.value)
            }
            disabled={operationStarted}
            placeholder="Ex.: Costa Serviços Médicos"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <button
          type="button"
          disabled={
            operationStarted ||
            companyName.trim().length < 2
          }
          onClick={onStart}
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {operationStarted
            ? "Operação iniciada"
            : "Iniciar operação"}
        </button>
      </div>

      {operationStarted && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            ATIVA
          </span>

          <span className="text-sm text-zinc-400">
            {companyName}
          </span>

          <span className="text-sm text-zinc-600">
            •
          </span>

          <span className="text-sm text-zinc-500">
            Aguardando primeira ação
          </span>
        </div>
      )}
    </section>
  );
}
