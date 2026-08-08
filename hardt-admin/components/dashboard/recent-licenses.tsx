"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import type { AdminLicense } from "@/lib/types/api";

type RecentLicensesProps = {
  licenses: AdminLicense[];
};

function formatDate(date: string | null): string {
  if (!date) {
    return "Não iniciada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function translateStatus(status: string): string {
  const labels: Record<string, string> = {
    active: "Ativa",
    pending_activation: "Pendente",
    suspended: "Suspensa",
    revoked: "Revogada",
    expired: "Expirada",
  };

  return labels[status] ?? status;
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const translated = translateStatus(status);

  const styles: Record<string, string> = {
    active:
      "border-violet-500/20 bg-violet-500/10 text-violet-300",
    pending_activation:
      "border-zinc-700 bg-zinc-800 text-zinc-300",
    suspended:
      "border-amber-500/20 bg-amber-500/10 text-amber-300",
    revoked:
      "border-red-500/20 bg-red-500/10 text-red-300",
    expired:
      "border-zinc-700 bg-zinc-950 text-zinc-500",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] ?? styles.pending_activation
      }`}
    >
      {translated}
    </span>
  );
}

export function RecentLicenses({
  licenses,
}: RecentLicensesProps) {
  const router = useRouter();

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Licenças recentes
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Últimas licenças emitidas pela Hardt Systems.
          </p>
        </div>

        <button
          onClick={() => router.push("/licenses")}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
        >
          Ver todas
        </button>
      </div>

      {licenses.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center px-6 text-sm text-zinc-500">
          Nenhuma licença emitida.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Licença
                </th>

                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Cliente
                </th>

                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Produto
                </th>

                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Status
                </th>

                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Dispositivos
                </th>

                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Expiração
                </th>

                <th className="w-14 px-6 py-4" />
              </tr>
            </thead>

            <tbody>
              {licenses.slice(0, 5).map((license) => (
                <tr
                  key={license.id}
                  className="cursor-pointer border-b border-zinc-800/70 transition last:border-0 hover:bg-zinc-900"
                  onClick={() =>
                    router.push(`/licenses/${license.id}`)
                  }
                >
                  <td className="px-6 py-5">
                    <span className="font-mono text-sm font-medium text-white">
                      {license.license_number}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <p className="text-sm text-zinc-300">
                      {license.user_name}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      {license.user_email}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-sm text-zinc-400">
                    {license.product_name}
                  </td>

                  <td className="px-6 py-5">
                    <StatusBadge status={license.status} />
                  </td>

                  <td className="px-6 py-5 text-sm text-zinc-400">
                    {license.active_devices} de {license.max_devices}
                  </td>

                  <td className="px-6 py-5 text-sm text-zinc-400">
                    {formatDate(license.expires_at)}
                  </td>

                  <td className="px-6 py-5">
                    <button
                      aria-label={`Opções da licença ${license.license_number}`}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
