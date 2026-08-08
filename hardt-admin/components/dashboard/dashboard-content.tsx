"use client";

import {
  CreditCard,
  KeyRound,
  Monitor,
  Package,
  Users,
} from "lucide-react";

import { StatsCard } from "./stats-card";
import { RevenueChart } from "./revenue-chart";
import { ActivityFeed } from "./activity-feed";
import { LicenseStatus } from "./license-status";
import { RecentLicenses } from "./recent-licenses";

import type {
  DashboardData,
  AdminLicense,
} from "@/lib/types/api";

type DashboardContentProps = {
  dashboard: DashboardData;
  licenses: AdminLicense[];
};

export function DashboardContent({
  dashboard,
  licenses,
}: DashboardContentProps) {
  return (
    <div className="space-y-8">
      

      {/* KPIs */}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">

        <StatsCard
          title="Receita"
          value="R$ 0,00"
          description="Sem pagamentos registrados"
          icon={CreditCard}
        />

        <StatsCard
          title="Usuários"
          value={dashboard.total_users}
          description={`${dashboard.total_users} cliente(s) cadastrado(s)`}
          icon={Users}
        />

        <StatsCard
          title="Licenças"
          value={dashboard.total_licenses}
          description={`${dashboard.active_licenses} licença(s) ativa(s)`}
          icon={KeyRound}
        />

        <StatsCard
          title="Produtos"
          value={dashboard.total_products}
          description="Produtos disponíveis"
          icon={Package}
        />

        <StatsCard
          title="Dispositivos"
          value={dashboard.total_devices}
          description={`${dashboard.active_devices} dispositivo(s) ativo(s)`}
          icon={Monitor}
        />

      </section>

      {/* Linha principal */}

      <section className="grid gap-6 xl:grid-cols-3">

        <div className="xl:col-span-2">
          <RevenueChart />
        </div>

        <LicenseStatus
          active={dashboard.active_licenses}
          pending={dashboard.pending_activation_licenses}
          suspended={dashboard.suspended_licenses}
          revoked={dashboard.revoked_licenses}
          expired={dashboard.expired_licenses}
          total={dashboard.total_licenses}
        />

      </section>
            {/* Licenças + Atividades */}

      <section className="grid gap-6 xl:grid-cols-3">

        <div className="xl:col-span-2">
          <RecentLicenses
            licenses={licenses}
          />
        </div>

        <ActivityFeed />

      </section>

      {/* Resumo Geral */}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-500">
            Licenças Ativas
          </p>

          <p className="mt-3 text-4xl font-bold text-white">
            {dashboard.active_licenses}
          </p>

          <p className="mt-2 text-sm text-emerald-400">
            Em funcionamento
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-500">
            Pendentes
          </p>

          <p className="mt-3 text-4xl font-bold text-yellow-400">
            {dashboard.pending_activation_licenses}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Aguardando ativação
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-500">
            Suspensas
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-400">
            {dashboard.suspended_licenses}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Temporariamente bloqueadas
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-500">
            Revogadas
          </p>

          <p className="mt-3 text-4xl font-bold text-red-400">
            {dashboard.revoked_licenses}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Licenças canceladas
          </p>
        </div>

      </section>

    </div>
  );
}