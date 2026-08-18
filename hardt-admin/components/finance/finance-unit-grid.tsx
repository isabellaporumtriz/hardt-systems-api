import {
  Building2,
} from "lucide-react";

import type {
  FinancialCashFlowUnit,
  FinancialManagementUnit,
} from "@/lib/api/finance-v2";

import {
  formatCurrency,
  formatPercent,
  getBusinessUnitLabel,
} from "@/components/finance/format";


type FinanceUnitGridProps = {
  managementUnits: FinancialManagementUnit[];
  cashUnits: FinancialCashFlowUnit[];
};


export function FinanceUnitGrid({
  managementUnits,
  cashUnits,
}: FinanceUnitGridProps) {
  return (
    <section>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Unidades de negócio
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white">
          Resultado por operação
        </h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {managementUnits.map((unit) => {
          const cash = cashUnits.find(
            (item) =>
              item.business_unit
              === unit.business_unit,
          );

          return (
            <article
              key={unit.business_unit}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {getBusinessUnitLabel(
                      unit.business_unit,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {formatPercent(
                      unit.revenue_share_percent,
                    )} da receita
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
                  <Building2 size={17} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs text-zinc-500">
                    Receita
                  </p>

                  <p className="mt-1 text-xl font-bold text-white">
                    {formatCurrency(
                      unit.total_revenue,
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                      Resultado
                    </p>

                    <p className="mt-1 text-sm font-semibold text-emerald-300">
                      {formatCurrency(
                        unit.net_result,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                      Caixa
                    </p>

                    <p className="mt-1 text-sm font-semibold text-sky-300">
                      {formatCurrency(
                        cash
                          ?.net_attributable_cash_flow
                          ?? 0,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
