"use client";

import {
  ArrowRight,
  CalendarDays,
  KeyRound,
  LoaderCircle,
  Monitor,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getClientDashboard } from "@/lib/api/client-dashboard";

import type {
  ClientDashboardData,
  ClientRecentLicense,
} from "@/lib/types/client-dashboard";

function formatDate(value: string | null): string {
  if (!value) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(value),
  );
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  })
    .format(new Date(value))
    .replace(".", "");
}

function daysUntil(value: string | null): string {
  if (!value) {
    return "Sem vencimento";
  }

  const now = new Date();
  const target = new Date(value);

  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const difference = Math.ceil(
    (target.getTime() - now.getTime())
      / 86_400_000,
  );

  if (difference < 0) {
    return `${Math.abs(difference)} dia(s) em atraso`;
  }

  if (difference === 0) {
    return "vence hoje";
  }

  return `em ${difference} dia(s)`;
}

function licenseStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Ativa",
    pending_activation: "Aguardando ativação",
    expired: "Expirada",
    suspended: "Suspensa",
    revoked: "Revogada",
  };

  return labels[status] ?? status;
}

function licenseStatusClass(status: string): string {
  if (status === "active") {
    return "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "pending_activation") {
    return "border border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border border-red-400/20 bg-red-400/10 text-red-300";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function LicenseRow({
  license,
}: {
  license: ClientRecentLicense;
}) {
  const usagePercentage =
    license.max_devices > 0
      ? Math.min(
          100,
          Math.round(
            (
              license.active_devices
              / license.max_devices
            ) * 100,
          ),
        )
      : 0;

  return (
    <div className="grid gap-4 border-b border-white/[0.06] px-6 py-5 last:border-b-0 md:grid-cols-[auto_1fr_auto]">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#251260] text-xl font-black text-white shadow-[0_12px_28px_rgba(76,29,149,0.24)]">
        {getInitials(license.product_name)}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-white">
            {license.product_name}
          </h3>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${licenseStatusClass(
              license.status,
            )}`}
          >
            {licenseStatusLabel(
              license.status,
            )}
          </span>
        </div>

        <p className="mt-2 text-sm text-white/45">
          Licença: {license.license_number}
        </p>

        <p className="mt-1 text-sm text-white/45">
          Versão: {license.product_version}
        </p>

        <p className="mt-1 text-sm text-white/45">
          Expira em:{" "}
          {formatDate(license.expires_at)}
        </p>
      </div>

      <div className="min-w-28">
        <p className="font-bold text-white">
          {license.active_devices} /{" "}
          {license.max_devices}
        </p>

        <p className="mt-1 text-xs text-white/40">
          Dispositivos
        </p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{
              width: `${usagePercentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PortalDashboardPage() {
  const [dashboard, setDashboard] =
    useState<ClientDashboardData | null>(
      null,
    );

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data =
          await getClientDashboard();

        setDashboard(data);
      } catch {
        setError(
          "Não foi possível carregar o dashboard.",
        );
      }
    }

    loadDashboard();
  }, []);

  const statCards = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        title: "Licenças Ativas",
        value: String(
          dashboard.licenses.active,
        ),
        subtitle: `de ${dashboard.licenses.total} adquiridas`,
        icon: KeyRound,
        progress:
          dashboard.licenses.total > 0
            ? (
                dashboard.licenses.active
                / dashboard.licenses.total
              ) * 100
            : 0,
        href: "/portal/licenses",
      },
      {
        title: "Dispositivos",
        value: String(
          dashboard.devices.active,
        ),
        subtitle: `de ${dashboard.devices.total_limit} permitidos`,
        icon: Monitor,
        progress:
          dashboard.devices.total_limit > 0
            ? (
                dashboard.devices.active
                / dashboard.devices.total_limit
              ) * 100
            : 0,
        href: "/portal/devices",
      },
      {
        title: "Próximo Vencimento",
        value: formatShortDate(
          dashboard.finance.next_due_at,
        ),
        subtitle: daysUntil(
          dashboard.finance.next_due_at,
        ),
        icon: CalendarDays,
        progress: 60,
        href: "/portal/licenses",
      },
    ];
  }, [dashboard]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-violet-500" />
      </div>
    );
  }

  const firstName =
    dashboard.customer.name
      .split(" ")
      .filter(Boolean)[0]
      ?? dashboard.customer.name;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <section>
        <p className="text-sm font-semibold text-violet-400">
          HARDT OS
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Olá, {firstName}! 👋
        </h1>

        <p className="mt-2 text-sm leading-6 text-white/45 sm:text-base">
          Bem-vindo ao Hardt Systems. Aqui você gerencia suas
          licenças e dispositivos.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm transition duration-300 hover:border-violet-500/25 hover:bg-white/[0.05]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-violet-400/15 bg-violet-500/10 text-violet-300">
                  <Icon size={25} />
                </div>

                <div>
                  <p className="text-sm font-medium text-white/65">
                    {card.title}
                  </p>

                  <p className="mt-1 text-3xl font-black tracking-tight text-violet-400">
                    {card.value}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4c1d95] to-[#8b5cf6]"
                  style={{
                    width: `${Math.min(
                      100,
                      card.progress,
                    )}%`,
                  }}
                />
              </div>

              <Link
                href={card.href}
                className="mt-5 flex items-center gap-2 text-sm font-semibold text-violet-400 transition hover:text-violet-300"
              >
                Ver detalhes
                <ArrowRight size={16} />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="mt-6">
        <article className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
            <h2 className="text-lg font-black text-white">
              Minhas Licenças
            </h2>

            <Link
              href="/portal/licenses"
              className="flex items-center gap-2 text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Ver todas
              <ArrowRight size={16} />
            </Link>
          </div>

          {dashboard.recent_licenses.length > 0 ? (
            <div>
              {dashboard.recent_licenses.map(
                (license) => (
                  <LicenseRow
                    key={license.id}
                    license={license}
                  />
                ),
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <KeyRound
                size={34}
                className="mx-auto text-violet-400/50"
              />

              <p className="mt-4 font-bold text-white">
                Nenhuma licença encontrada
              </p>

              <p className="mt-2 text-sm text-white/40">
                Suas licenças aparecerão aqui.
              </p>
            </div>
          )}

          <div className="border-t border-white/[0.06] px-6 py-5 text-center">
            <Link
              href="/portal/licenses"
              className="font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Ver todas as licenças
            </Link>
          </div>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-violet-500/15 bg-gradient-to-r from-violet-500/[0.07] to-indigo-500/[0.03] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="relative flex min-h-36 items-center overflow-hidden px-7 py-7">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.18),transparent_65%)]" />

          <div className="relative flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] text-white shadow-[0_16px_36px_rgba(124,58,237,0.28)]">
              <KeyRound size={28} />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">
                Proteção e performance para o seu negócio
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                Mantenha seus sistemas sempre protegidos com as
                soluções Hardt Systems.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
