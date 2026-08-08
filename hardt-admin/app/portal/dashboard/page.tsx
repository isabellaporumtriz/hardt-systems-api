"use client";

import {
  ArrowRight,
  CalendarDays,
  CreditCard,
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
  ClientRecentCharge,
  ClientRecentLicense,
} from "@/lib/types/client-dashboard";

function formatCurrency(value: string | null): string {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(value)
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
      / 86_400_000
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
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "pending_activation") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-red-100 text-red-700";
}

function chargeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    overdue: "Em atraso",
    paid: "Paga",
    canceled: "Cancelada",
  };

  return labels[status] ?? status;
}

function chargeStatusClass(status: string): string {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "overdue") {
    return "bg-red-100 text-red-700";
  }

  return "bg-violet-100 text-violet-700";
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
            (license.active_devices
              / license.max_devices)
              * 100
          )
        )
      : 0;

  return (
    <div className="grid gap-4 border-b border-[#f0eff5] px-6 py-5 last:border-b-0 md:grid-cols-[auto_1fr_auto]">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#251260] text-xl font-black text-white shadow-[0_12px_28px_rgba(76,29,149,0.24)]">
        {getInitials(license.product_name)}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-[#211942]">
            {license.product_name}
          </h3>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${licenseStatusClass(
              license.status
            )}`}
          >
            {licenseStatusLabel(
              license.status
            )}
          </span>
        </div>

        <p className="mt-2 text-sm text-[#696477]">
          Licença: {license.license_number}
        </p>

        <p className="mt-1 text-sm text-[#696477]">
          Versão: {license.product_version}
        </p>

        <p className="mt-1 text-sm text-[#696477]">
          Expira em:{" "}
          {formatDate(license.expires_at)}
        </p>
      </div>

      <div className="min-w-28">
        <p className="font-bold text-[#211942]">
          {license.active_devices} /{" "}
          {license.max_devices}
        </p>

        <p className="mt-1 text-xs text-[#777386]">
          Dispositivos
        </p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ecebf2]">
          <div
            className="h-full rounded-full bg-violet-600"
            style={{
              width: `${usagePercentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ChargeCard({
  charge,
}: {
  charge: ClientRecentCharge;
}) {
  return (
    <div className="border-b border-[#f0eff5] p-6 last:border-b-0">
      <span
        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${chargeStatusClass(
          charge.status
        )}`}
      >
        {chargeStatusLabel(charge.status)}
      </span>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-[#211942]">
            Fatura #{charge.charge_number}
          </h3>

          <p className="mt-2 text-sm text-[#6f6a7d]">
            {charge.description}
          </p>

          <p className="mt-1 text-sm text-[#6f6a7d]">
            Vencimento:{" "}
            {formatDate(charge.due_at)}
          </p>

          <p className="mt-1 text-sm uppercase text-[#6f6a7d]">
            {charge.payment_method
              ?? "Pagamento não definido"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xl font-black text-violet-700">
            {formatCurrency(charge.amount)}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#292044]">
            {daysUntil(charge.due_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PortalDashboardPage() {
  const [dashboard, setDashboard] =
    useState<ClientDashboardData | null>(
      null
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
          "Não foi possível carregar o dashboard."
        );
      }
    }

    loadDashboard();
  }, []);

  const statCards = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    const totalPending =
      Number(
        dashboard.finance.pending_amount
      )
      + Number(
        dashboard.finance.overdue_amount
      );

    return [
      {
        title: "Licenças Ativas",
        value: String(
          dashboard.licenses.active
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
          dashboard.devices.active
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
          dashboard.finance.next_due_at
        ),
        subtitle: daysUntil(
          dashboard.finance.next_due_at
        ),
        icon: CalendarDays,
        progress: 60,
        href: "/portal/charges",
      },
      {
        title: "Pendências",
        value: formatCurrency(
          String(totalPending)
        ),
        subtitle: `${
          dashboard.finance.pending_charges
          + dashboard.finance.overdue_charges
        } cobrança(s) em aberto`,
        icon: CreditCard,
        progress:
          totalPending > 0 ? 100 : 0,
        href: "/portal/charges",
      },
    ];
  }, [dashboard]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-violet-600" />
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
        <p className="text-sm font-semibold text-violet-600">
          HARDT OS
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#18122f] sm:text-4xl">
          Olá, {firstName}! 👋
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#777386] sm:text-base">
          Bem-vindo ao Hardt Systems. Aqui você gerencia suas
          licenças, dispositivos e cobranças.
        </p>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-[24px] border border-[#ebeaf2] bg-white p-6 shadow-[0_18px_60px_rgba(41,28,90,0.07)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Icon size={25} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#37304f]">
                    {card.title}
                  </p>

                  <p className="mt-1 text-3xl font-black tracking-tight text-[#6d28d9]">
                    {card.value}
                  </p>

                  <p className="mt-1 text-xs text-[#7d798a]">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#eeeef4]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#35138f] to-[#7c3aed]"
                  style={{
                    width: `${Math.min(
                      100,
                      card.progress
                    )}%`,
                  }}
                />
              </div>

              <Link
                href={card.href}
                className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#40208f]"
              >
                Ver detalhes
                <ArrowRight size={16} />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <article className="overflow-hidden rounded-[24px] border border-[#ebeaf2] bg-white shadow-[0_18px_60px_rgba(41,28,90,0.07)]">
          <div className="flex items-center justify-between border-b border-[#eeeef4] px-6 py-5">
            <h2 className="text-lg font-black text-[#20183d]">
              Minhas Licenças
            </h2>

            <Link
              href="/portal/licenses"
              className="flex items-center gap-2 text-sm font-semibold text-[#5b21b6]"
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
                )
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <KeyRound
                size={34}
                className="mx-auto text-violet-300"
              />

              <p className="mt-4 font-bold text-[#211942]">
                Nenhuma licença encontrada
              </p>

              <p className="mt-2 text-sm text-[#777386]">
                Suas licenças aparecerão aqui.
              </p>
            </div>
          )}

          <div className="border-t border-[#f0eff5] px-6 py-5 text-center">
            <Link
              href="/portal/licenses"
              className="font-semibold text-violet-700"
            >
              Ver todas as licenças
            </Link>
          </div>
        </article>

        <article className="overflow-hidden rounded-[24px] border border-[#ebeaf2] bg-white shadow-[0_18px_60px_rgba(41,28,90,0.07)]">
          <div className="flex items-center justify-between border-b border-[#eeeef4] px-6 py-5">
            <h2 className="text-lg font-black text-[#20183d]">
              Próximas Cobranças
            </h2>

            <Link
              href="/portal/charges"
              className="flex items-center gap-2 text-sm font-semibold text-[#5b21b6]"
            >
              Ver todas
              <ArrowRight size={16} />
            </Link>
          </div>

          {dashboard.recent_charges.length > 0 ? (
            <div>
              {dashboard.recent_charges.map(
                (charge) => (
                  <ChargeCard
                    key={charge.id}
                    charge={charge}
                  />
                )
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <CreditCard
                size={34}
                className="mx-auto text-violet-300"
              />

              <p className="mt-4 font-bold text-[#211942]">
                Nenhuma cobrança encontrada
              </p>

              <p className="mt-2 text-sm text-[#777386]">
                Você não possui cobranças recentes.
              </p>
            </div>
          )}

          <div className="border-t border-[#f0eff5] px-6 py-5 text-center">
            <Link
              href="/portal/charges"
              className="font-semibold text-violet-700"
            >
              Ver todas as cobranças
            </Link>
          </div>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-[0_18px_60px_rgba(41,28,90,0.07)]">
        <div className="relative flex min-h-36 items-center overflow-hidden px-7 py-7">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.25),transparent_65%)]" />

          <div className="relative flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] text-white shadow-[0_16px_36px_rgba(124,58,237,0.28)]">
              <KeyRound size={28} />
            </div>

            <div>
              <h2 className="text-lg font-black text-[#251c48]">
                Proteção e performance para o seu negócio
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#6e697b]">
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
