"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldOff,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getClientLicenseKey,
  getClientLicenses,
  renewClientLicense,
} from "@/lib/api/client-licenses";

import type {
  ClientLicenseItem,
  ClientLicenseListResponse,
  ClientLicenseStatus,
} from "@/lib/types/client-licenses";

const statusOptions: Array<{
  value: ClientLicenseStatus | "";
  label: string;
}> = [
  {
    value: "",
    label: "Todos os status",
  },
  {
    value: "active",
    label: "Ativas",
  },
  {
    value: "pending_activation",
    label: "Aguardando ativação",
  },
  {
    value: "expired",
    label: "Expiradas",
  },
  {
    value: "suspended",
    label: "Suspensas",
  },
  {
    value: "revoked",
    label: "Revogadas",
  },
];

function formatDate(value: string | null): string {
  if (!value) {
    return "Sem vencimento";
  }

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(value),
  );
}

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
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

function statusLabel(
  status: ClientLicenseStatus,
): string {
  const labels: Record<
    ClientLicenseStatus,
    string
  > = {
    active: "Ativa",
    pending_activation:
      "Aguardando ativação",
    expired: "Expirada",
    suspended: "Suspensa",
    revoked: "Revogada",
  };

  return labels[status];
}

function statusClass(
  status: ClientLicenseStatus,
): string {
  const classes: Record<
    ClientLicenseStatus,
    string
  > = {
    active:
      "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    pending_activation:
      "border border-amber-400/20 bg-amber-400/10 text-amber-300",
    expired:
      "border border-white/10 bg-white/[0.05] text-white/50",
    suspended:
      "border border-orange-400/20 bg-orange-400/10 text-orange-300",
    revoked:
      "border border-red-400/20 bg-red-400/10 text-red-300",
  };

  return classes[status];
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof KeyRound;
}) {
  return (
    <article className="rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-400/15 bg-violet-500/10 text-violet-300">
          <Icon size={22} />
        </div>

        <div>
          <p className="text-sm font-medium text-white/45">
            {title}
          </p>

          <p className="mt-1 text-2xl font-black text-white">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}

function LicenseRow({
  license,
}: {
  license: ClientLicenseItem;
}) {
  const [copied, setCopied] =
    useState(false);

  const [loadingKey, setLoadingKey] =
    useState(false);

  const [fullKey, setFullKey] =
    useState<string | null>(null);

  const [showKey, setShowKey] =
    useState(false);

  const [keyError, setKeyError] =
    useState("");

  const [renewing, setRenewing] =
    useState(false);

  const [renewError, setRenewError] =
    useState("");

  const devicePercentage =
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

  async function loadFullKey(): Promise<
    string | null
  > {
    if (fullKey) {
      return fullKey;
    }

    setLoadingKey(true);
    setKeyError("");

    try {
      const response =
        await getClientLicenseKey(
          license.id,
        );

      setFullKey(response.license_key);

      return response.license_key;
    } catch {
      setKeyError(
        "Não foi possível consultar a chave.",
      );

      return null;
    } finally {
      setLoadingKey(false);
    }
  }

  async function toggleKey() {
    if (showKey) {
      setShowKey(false);
      return;
    }

    const licenseKey =
      await loadFullKey();

    if (licenseKey) {
      setShowKey(true);
    }
  }

  async function copyLicenseKey() {
    const licenseKey =
      fullKey ?? (await loadFullKey());

    if (!licenseKey) {
      return;
    }

    await navigator.clipboard.writeText(
      licenseKey,
    );

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  async function handleRenew() {
    if (license.status === "revoked") {
      setRenewError(
        "Licenças revogadas não podem ser renovadas.",
      );
      return;
    }

    setRenewing(true);
    setRenewError("");

    try {
      const response =
        await renewClientLicense(
          license.id,
        );

      const checkoutWindow = window.open(
        response.invoice_url,
        "_blank",
        "noopener,noreferrer",
      );

      if (!checkoutWindow) {
        window.location.href =
          response.invoice_url;
      }
    } catch {
      setRenewError(
        "Não foi possível gerar a renovação agora.",
      );
    } finally {
      setRenewing(false);
    }
  }

  return (
    <div className="border-b border-white/[0.06] px-6 py-5 last:border-b-0">
      <div className="grid gap-5 xl:grid-cols-[auto_1.35fr_1.25fr_0.8fr_0.8fr_auto] xl:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#251260] text-lg font-black text-white shadow-[0_12px_28px_rgba(76,29,149,0.22)]">
          {getInitials(
            license.product_name,
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-white">
              {license.product_name}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                license.status,
              )}`}
            >
              {statusLabel(
                license.status,
              )}
            </span>
          </div>

          <p className="mt-2 text-sm text-white/45">
            {license.license_number}
          </p>

          <p className="mt-1 text-xs text-white/30">
            Versão{" "}
            {license.product_version}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
            Chave
          </p>

          <button
            type="button"
            onClick={copyLicenseKey}
            disabled={loadingKey}
            className="mt-2 flex max-w-full items-center gap-2 text-left text-sm font-semibold text-white/75 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="break-all">
              {showKey && fullKey
                ? fullKey
                : license.key_preview}
            </span>

            <Copy
              size={14}
              className="shrink-0 text-white/40"
            />

            {copied && (
              <span className="shrink-0 text-xs text-emerald-400">
                Copiado
              </span>
            )}
          </button>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleKey}
              disabled={loadingKey}
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingKey
                ? "Carregando..."
                : showKey
                  ? "Ocultar chave"
                  : "Mostrar chave"}
            </button>

            <Link
              href="/portal/downloads"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/70 transition hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
            >
              Baixar robô
            </Link>
          </div>

          {keyError && (
            <p className="mt-2 text-xs font-medium text-red-400">
              {keyError}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
            Dispositivos
          </p>

          <p className="mt-2 font-bold text-white">
            {license.active_devices} /{" "}
            {license.max_devices}
          </p>

          <div className="mt-2 h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-violet-500"
              style={{
                width: `${devicePercentage}%`,
              }}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
            Vencimento
          </p>

          <p className="mt-2 text-sm font-semibold text-white/75">
            {formatDate(
              license.expires_at,
            )}
          </p>
        </div>

        <div className="flex min-w-[150px] flex-col items-stretch gap-2">
          <button
            type="button"
            onClick={handleRenew}
            disabled={
              renewing
              || license.status === "revoked"
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(124,58,237,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {renewing ? (
              <>
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                Renovar
              </>
            )}
          </button>

          {renewError && (
            <p className="max-w-[170px] text-xs font-medium leading-5 text-red-400">
              {renewError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortalLicensesPage() {
  const [data, setData] =
    useState<ClientLicenseListResponse | null>(
      null,
    );

  const [page, setPage] =
    useState(1);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<ClientLicenseStatus | "">(
      "",
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadLicenses =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const response =
          await getClientLicenses({
            page,
            pageSize: 10,
            search,
            status,
          });

        setData(response);
      } catch {
        setError(
          "Não foi possível carregar suas licenças.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [page, search, status]);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  function handleSearch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(
    value: string,
  ) {
    setPage(1);

    setStatus(
      value as
        | ClientLicenseStatus
        | "",
    );
  }

  const summary = data?.summary ?? {
    total: 0,
    active: 0,
    pending_activation: 0,
    expired: 0,
    suspended: 0,
    revoked: 0,
  };

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <section>
        <p className="text-sm font-semibold text-violet-400">
          HARDT OS
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Minhas Licenças
        </h1>

        <p className="mt-2 text-sm leading-6 text-white/45 sm:text-base">
          Consulte seus produtos, ativações,
          dispositivos e vencimentos.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total"
          value={summary.total}
          icon={KeyRound}
        />

        <SummaryCard
          title="Ativas"
          value={summary.active}
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Aguardando ativação"
          value={
            summary.pending_activation
          }
          icon={Clock3}
        />

        <SummaryCard
          title="Expiradas"
          value={summary.expired}
          icon={XCircle}
        />

        <SummaryCard
          title="Bloqueadas"
          value={
            summary.suspended
            + summary.revoked
          }
          icon={ShieldOff}
        />
      </section>

      <section className="mt-6 rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Buscar por produto, licença ou chave"
                className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"
              />
            </div>

            <button
              type="submit"
              className="h-12 rounded-xl bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] px-5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Buscar
            </button>
          </form>

          <select
            value={status}
            onChange={(event) =>
              handleStatusChange(
                event.target.value,
              )
            }
            className="h-12 rounded-xl border border-white/[0.08] bg-[#111116] px-4 text-sm font-semibold text-white/70 outline-none focus:border-violet-500/50"
          >
            {statusOptions.map(
              (option) => (
                <option
                  key={
                    option.value
                    || "all"
                  }
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-white">
              Licenças adquiridas
            </h2>

            <p className="mt-1 text-sm text-white/40">
              {data?.total ?? 0} resultado(s)
              encontrado(s)
            </p>
          </div>

          {(search || status) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setStatus("");
                setPage(1);
              }}
              className="text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <LoaderCircle className="animate-spin text-violet-500" />
          </div>
        ) : error ? (
          <div className="flex min-h-80 items-center justify-center px-6 text-center">
            <div>
              <AlertTriangle
                size={36}
                className="mx-auto text-red-400"
              />

              <p className="mt-4 font-bold text-red-300">
                {error}
              </p>

              <button
                type="button"
                onClick={loadLicenses}
                className="mt-4 text-sm font-semibold text-violet-400"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : data &&
          data.items.length > 0 ? (
          <div>
            {data.items.map(
              (license) => (
                <LicenseRow
                  key={license.id}
                  license={license}
                />
              ),
            )}
          </div>
        ) : (
          <div className="flex min-h-80 items-center justify-center px-6 text-center">
            <div>
              <KeyRound
                size={42}
                className="mx-auto text-violet-400/45"
              />

              <h3 className="mt-4 text-lg font-black text-white">
                Nenhuma licença encontrada
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
                {search || status
                  ? "Não encontramos licenças com os filtros selecionados."
                  : "Quando uma licença for vinculada à sua conta, ela aparecerá aqui."}
              </p>
            </div>
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-5">
            <p className="text-sm text-white/40">
              Página {data.page} de{" "}
              {data.pages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                  )
                }
                className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-semibold text-white/65 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={15} />
                Anterior
              </button>

              <button
                type="button"
                disabled={
                  page >= data.pages
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      data.pages,
                      current + 1,
                    ),
                  )
                }
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
