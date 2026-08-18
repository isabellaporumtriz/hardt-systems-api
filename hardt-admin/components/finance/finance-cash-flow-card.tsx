import {
  ArrowDownToLine,
  ArrowUpFromLine,
  WalletCards,
} from "lucide-react";

import type {
  FinancialCashFlowSummary,
} from "@/lib/api/finance-v2";

import {
  formatCurrency,
} from "@/components/finance/format";


type FinanceCashFlowCardProps = {
  cashFlow: FinancialCashFlowSummary;
};


export function FinanceCashFlowCard({
  cashFlow,
}: FinanceCashFlowCardProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Fluxo de caixa
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Dinheiro efetivamente movimentado
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Separado do reconhecimento gerencial da DRE
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-300">
          <WalletCards size={19} />
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <ArrowDownToLine size={16} />

            <span className="text-xs font-semibold uppercase tracking-wider">
              Entradas
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(
              cashFlow.total_inflows,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center gap-2 text-rose-300">
            <ArrowUpFromLine size={16} />

            <span className="text-xs font-semibold uppercase tracking-wider">
              Saídas
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(
              cashFlow.total_outflows,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center gap-2 text-sky-300">
            <WalletCards size={16} />

            <span className="text-xs font-semibold uppercase tracking-wider">
              Líquido
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(
              cashFlow.net_cash_flow,
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-300">
              Cobranças recebidas
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              {cashFlow.charge_inflow_count} pagamento(s)
            </p>
          </div>

          <p className="font-semibold text-white">
            {formatCurrency(
              cashFlow.charge_inflows,
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-300">
              Topups de carteira
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Caixa recebido ainda não alocado a produto
            </p>
          </div>

          <p className="font-semibold text-violet-300">
            {formatCurrency(
              cashFlow.wallet_topup_inflows,
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-300">
              Reembolsos e despesas
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Saídas efetivas registradas
            </p>
          </div>

          <p className="font-semibold text-rose-300">
            {formatCurrency(
              cashFlow.total_outflows,
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
