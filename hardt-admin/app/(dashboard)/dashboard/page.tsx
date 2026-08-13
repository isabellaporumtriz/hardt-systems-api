"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import {
  getDashboard,
  getLicenses,
} from "@/lib/api/admin";

import {
  getFinancialDashboard,
} from "@/lib/api/finance";

import type {
  AdminLicense,
  DashboardData,
} from "@/lib/types/api";

import type {
  FinancialDashboard,
} from "@/lib/api/finance";

export default function DashboardPage() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [licenses, setLicenses] =
    useState<AdminLicense[]>([]);

  const [financial, setFinancial] =
    useState<FinancialDashboard | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          dashboardData,
          licensesData,
          financialData,
        ] = await Promise.all([
          getDashboard(),
          getLicenses(),
          getFinancialDashboard(10),
        ]);

        setDashboard(dashboardData);
        setLicenses(licensesData);
        setFinancial(financialData);
      } catch {
        setError(
          "Não foi possível carregar o dashboard."
        );
      }
    }

    loadDashboard();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!dashboard || !financial) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <DashboardContent
      dashboard={dashboard}
      licenses={licenses}
      financial={financial}
    />
  );
}