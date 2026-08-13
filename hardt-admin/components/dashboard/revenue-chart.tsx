"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import type { MonthlyRevenueItem } from "@/lib/api/finance";

type RevenueChartProps = {
  items: MonthlyRevenueItem[];
  totalRevenue: string;
};

function formatCurrency(
  value: number | string,
) {
  const numericValue = Number(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(
    Number.isFinite(numericValue)
      ? numericValue
      : 0,
  );
}

export function RevenueChart({
  items,
  totalRevenue,
}: RevenueChartProps) {
  const data = items
    .slice(-7)
    .map((item) => ({
      month: item.label || item.month,
      revenue: Number(item.revenue) || 0,
      payments: item.payments || 0,
    }));

  const paymentCount = data.reduce(
    (total, item) =>
      total + item.payments,
    0,
  );

  return (
    <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Receita
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {formatCurrency(totalRevenue)}
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            {paymentCount > 0
              ? `${paymentCount} pagamento(s) nos últimos meses`
              : "Sem pagamentos registrados"}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-2">
          <span className="text-sm font-medium text-violet-300">
            Últimos 7 meses
          </span>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id="gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#8b5cf6"
                  stopOpacity={0.45}
                />

                <stop
                  offset="100%"
                  stopColor="#8b5cf6"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#27272a"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              stroke="#71717a"
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              formatter={(value) => [
                formatCurrency(
                  typeof value === "number"
                    ? value
                    : Number(value),
                ),
                "Receita",
              ]}
              contentStyle={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 16,
                color: "#fff",
              }}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8b5cf6"
              strokeWidth={4}
              fill="url(#gradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
