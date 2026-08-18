"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  FinanceGranularity,
  FinancialTimeSeriesPoint,
} from "@/lib/api/finance-v2";

import {
  formatCurrency,
  formatPeriodLabel,
  toFiniteNumber,
} from "@/components/finance/format";


type FinanceTimeSeriesChartProps = {
  points: FinancialTimeSeriesPoint[];
  granularity: FinanceGranularity;
};


export function FinanceTimeSeriesChart({
  points,
  granularity,
}: FinanceTimeSeriesChartProps) {
  const data = points.map((point) => ({
    period: formatPeriodLabel(
      point.period_start,
      granularity,
    ),
    revenue: toFiniteNumber(
      point.total_revenue,
    ),
    result: toFiniteNumber(
      point.net_result,
    ),
    cash: toFiniteNumber(
      point.net_cash_flow,
    ),
  }));

  return (
    <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Evolução financeira
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Receita, resultado e caixa
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            DRE gerencial comparada ao fluxo de caixa real
          </p>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300">
          {granularity === "day"
            ? "Visão diária"
            : "Visão mensal"}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 flex h-80 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40">
          <p className="text-sm text-zinc-500">
            Nenhum movimento no período selecionado.
          </p>
        </div>
      ) : (
        <div className="mt-7 h-80">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={data}
              margin={{
                top: 8,
                right: 12,
                bottom: 4,
                left: 4,
              }}
            >
              <CartesianGrid
                stroke="#27272a"
                vertical={false}
              />

              <XAxis
                dataKey="period"
                stroke="#71717a"
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#71717a"
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(value) =>
                  new Intl.NumberFormat(
                    "pt-BR",
                    {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    },
                  ).format(
                    Number(value),
                  )
                }
              />

              <Tooltip
                formatter={(value, name) => {
                  const labels: Record<
                    string,
                    string
                  > = {
                    revenue: "Receita",
                    result: "Resultado",
                    cash: "Caixa líquido",
                  };

                  return [
                    formatCurrency(
                      typeof value === "number"
                        ? value
                        : Number(value),
                    ),
                    labels[String(name)]
                      ?? String(name),
                  ];
                }}
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 16,
                  color: "#fff",
                }}
              />

              <Legend
                formatter={(value) => {
                  const labels: Record<
                    string,
                    string
                  > = {
                    revenue: "Receita",
                    result: "Resultado",
                    cash: "Caixa líquido",
                  };

                  return (
                    labels[value]
                    ?? value
                  );
                }}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />

              <Line
                type="monotone"
                dataKey="result"
                stroke="#34d399"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />

              <Line
                type="monotone"
                dataKey="cash"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
