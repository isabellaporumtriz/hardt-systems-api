import {
  PackageSearch,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  FinancialProductPerformanceItem,
} from "@/lib/api/finance-v2";

import {
  formatCurrency,
  formatPercent,
  getBusinessUnitLabel,
} from "@/components/finance/format";


type FinanceProductTableProps = {
  products: FinancialProductPerformanceItem[];
};


export function FinanceProductTable({
  products,
}: FinanceProductTableProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 lg:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Produtos
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Performance financeira
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Receita, custos, margem e participação por produto
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
          <PackageSearch size={19} />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center p-8">
          <p className="text-sm text-zinc-500">
            Nenhum produto disponível.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="px-5 text-zinc-500">
                Produto
              </TableHead>

              <TableHead className="text-zinc-500">
                Unidade
              </TableHead>

              <TableHead className="text-right text-zinc-500">
                Vendas
              </TableHead>

              <TableHead className="text-right text-zinc-500">
                Receita
              </TableHead>

              <TableHead className="text-right text-zinc-500">
                Custos
              </TableHead>

              <TableHead className="text-right text-zinc-500">
                Margem
              </TableHead>

              <TableHead className="pr-5 text-right text-zinc-500">
                Share
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.map((product) => (
              <TableRow
                key={
                  product.product_id
                  ?? `${product.business_unit}:${product.product_name}`
                }
                className="border-zinc-800 hover:bg-zinc-800/30"
              >
                <TableCell className="px-5 py-4">
                  <p className="font-semibold text-white">
                    {product.product_name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {product.product_slug
                      ?? "Sem produto vinculado"}
                  </p>
                </TableCell>

                <TableCell className="text-zinc-400">
                  {getBusinessUnitLabel(
                    product.business_unit,
                  )}
                </TableCell>

                <TableCell className="text-right text-zinc-300">
                  {product.total_sales_count}
                </TableCell>

                <TableCell className="text-right font-semibold text-white">
                  {formatCurrency(
                    product.total_revenue,
                  )}
                </TableCell>

                <TableCell className="text-right text-zinc-400">
                  {formatCurrency(
                    product.direct_costs,
                  )}
                </TableCell>

                <TableCell className="text-right text-emerald-300">
                  {formatPercent(
                    product.gross_margin_percent,
                  )}
                </TableCell>

                <TableCell className="pr-5 text-right text-violet-300">
                  {formatPercent(
                    product.revenue_share_percent,
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
