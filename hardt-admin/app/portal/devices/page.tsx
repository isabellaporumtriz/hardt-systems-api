"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Clock3,
  Copy,
  Laptop,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deactivateClientDevice,
  getClientDevices,
} from "@/lib/api/client-devices";
import type {
  ClientDevice,
  ClientDeviceListResponse,
} from "@/lib/types/client-devices";

type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 10;

function formatDate(value: string | null): string {
  if (!value) {
    return "Nunca validado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDeviceIcon(operatingSystem: string | null) {
  const system = operatingSystem?.toLowerCase() ?? "";

  if (
    system.includes("android") ||
    system.includes("ios") ||
    system.includes("iphone")
  ) {
    return Smartphone;
  }

  return Laptop;
}

function getDeviceName(device: ClientDevice): string {
  return device.name?.trim() || "Dispositivo sem nome";
}

function shortenIdentifier(identifier: string): string {
  if (identifier.length <= 24) {
    return identifier;
  }

  return `${identifier.slice(0, 12)}...${identifier.slice(-8)}`;
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Laptop;
}) {
  return (
    <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6f687c]">{title}</p>
          <strong className="mt-2 block text-3xl font-bold tracking-tight text-[#211633]">
            {value}
          </strong>
          <p className="mt-2 text-xs text-[#81798d]">{description}</p>
        </div>

        <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function DeviceStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ativo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-[#6f687c]">
      <CircleOff className="h-3.5 w-3.5" />
      Inativo
    </span>
  );
}

export default function ClientDevicesPage() {
  const [data, setData] = useState<ClientDeviceListResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isActiveFilter = useMemo(() => {
    if (status === "active") {
      return true;
    }

    if (status === "inactive") {
      return false;
    }

    return undefined;
  }, [status]);

  const loadDevices = useCallback(
    async (refresh = false) => {
      try {
        setError(null);

        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await getClientDevices({
          page,
          pageSize: PAGE_SIZE,
          search,
          isActive: isActiveFilter,
        });

        setData(response);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar os dispositivos.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isActiveFilter, page, search],
  );

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function handleDeactivate(device: ClientDevice) {
    const confirmed = window.confirm(
      `Deseja desativar "${getDeviceName(device)}"?\n\nEsse dispositivo deixará de validar a licença até uma nova ativação.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setDeactivatingId(device.id);

      const response = await deactivateClientDevice(device.id);

      setSuccessMessage(response.message);
      await loadDevices(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível desativar o dispositivo.",
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleCopyIdentifier(identifier: string) {
    try {
      await navigator.clipboard.writeText(identifier);
      setSuccessMessage("Identificador copiado.");
    } catch {
      setError("Não foi possível copiar o identificador.");
    }
  }

  const summary = data?.summary ?? {
    active: 0,
    inactive: 0,
    total: 0,
    total_limit: 0,
  };

  return (
    <main className="min-h-full text-[#211633]">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#7c2cff]">
              <MonitorSmartphone className="h-4 w-4" />
              Hardt OS
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#211633] md:text-4xl">
              Dispositivos
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f687c]">
              Acompanhe os computadores e celulares vinculados às suas
              licenças.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDevices(true)}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e6dff0] bg-white px-4 text-sm font-semibold text-[#4a4058] shadow-sm transition hover:border-[#b897f5] hover:bg-[#f8f4ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total de dispositivos"
            value={summary.total}
            description="Todos os dispositivos vinculados"
            icon={MonitorSmartphone}
          />

          <SummaryCard
            title="Dispositivos ativos"
            value={summary.active}
            description="Com acesso atualmente permitido"
            icon={ShieldCheck}
          />

          <SummaryCard
            title="Dispositivos inativos"
            value={summary.inactive}
            description="Desativados ou substituídos"
            icon={Unplug}
          />

          <SummaryCard
            title="Limite contratado"
            value={summary.total_limit}
            description="Soma dos limites das licenças"
            icon={Laptop}
          />
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-[#ebe6f2] bg-white shadow-[0_16px_45px_rgba(48,31,77,0.07)]">
          <div className="flex flex-col gap-4 border-b border-[#eee9f4] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8497]" />

              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nome, sistema, produto ou licença..."
                className="h-11 w-full rounded-xl border border-[#ded7e7] bg-[#fbfaff] pl-10 pr-4 text-sm text-[#211633] outline-none transition placeholder:text-[#96909f] focus:border-[#8a3ffc] focus:ring-2 focus:ring-[#8a3ffc]/10"
              />
            </div>

            <div className="flex rounded-xl border border-[#e4deeb] bg-[#f3f0f6] p-1">
              {(
                [
                  ["all", "Todos"],
                  ["active", "Ativos"],
                  ["inactive", "Inativos"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setStatus(value);
                  }}
                  className={`rounded-lg px-3.5 py-2 text-sm transition ${
                    status === value
                      ? "bg-[#7c2cff] text-white shadow-md shadow-purple-200"
                      : "text-[#81798d] hover:text-[#211633]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-[#6f687c]">
                <Loader2 className="h-7 w-7 animate-spin text-[#7c2cff]" />
                <span className="text-sm">Carregando dispositivos...</span>
              </div>
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="divide-y divide-[#eee9f4]">
                {data.items.map((device) => {
                  const DeviceIcon = getDeviceIcon(device.operating_system);

                  return (
                    <article
                      key={device.id}
                      className="grid gap-5 p-5 transition hover:bg-[#fbf9ff] xl:grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_minmax(210px,0.9fr)_auto] xl:items-center"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                          <DeviceIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-semibold text-[#211633]">
                              {getDeviceName(device)}
                            </h2>

                            <DeviceStatusBadge isActive={device.is_active} />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyIdentifier(
                                device.device_identifier,
                              )
                            }
                            title={device.device_identifier}
                            className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-[#81798d] transition hover:text-[#51495d]"
                          >
                            <span className="truncate font-mono">
                              {shortenIdentifier(device.device_identifier)}
                            </span>
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#8c8497]">
                          Sistema
                        </p>

                        <p className="mt-1.5 text-sm text-[#393044]">
                          {device.operating_system || "Não identificado"}
                        </p>

                        <p className="mt-1 text-xs text-[#81798d]">
                          Versão do app: {device.app_version || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#8c8497]">
                          Licença
                        </p>

                        <p className="mt-1.5 truncate text-sm text-[#393044]">
                          {device.product_name}
                        </p>

                        <p className="mt-1 truncate font-mono text-xs text-[#81798d]">
                          {device.license_number}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 xl:items-end">
                        <div className="text-left xl:text-right">
                          <p className="flex items-center gap-1.5 text-xs text-[#81798d] xl:justify-end">
                            <Clock3 className="h-3.5 w-3.5" />
                            Última validação
                          </p>

                          <p className="mt-1 text-sm text-[#51495d]">
                            {formatDate(device.last_validated_at)}
                          </p>
                        </div>

                        {device.is_active ? (
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(device)}
                            disabled={deactivatingId === device.id}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deactivatingId === device.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Unplug className="h-3.5 w-3.5" />
                            )}

                            Desativar
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <footer className="flex flex-col gap-4 border-t border-[#eee9f4] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                  {data.total}{" "}
                  {data.total === 1
                    ? "dispositivo encontrado"
                    : "dispositivos encontrados"}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((currentPage) =>
                        Math.max(1, currentPage - 1),
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-sm text-[#51495d] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>

                  <span className="px-2 text-sm text-zinc-500">
                    Página {data.page} de {Math.max(data.pages, 1)}
                  </span>

                  <button
                    type="button"
                    disabled={page >= data.pages}
                    onClick={() =>
                      setPage((currentPage) => currentPage + 1)
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-sm text-[#51495d] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex min-h-[390px] flex-col items-center justify-center px-6 text-center">
              <div className="rounded-2xl border border-[#dccdff] bg-[#f1eaff] p-4 text-[#7c2cff]">
                <MonitorSmartphone className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-[#211633]">
                Nenhum dispositivo encontrado
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#756d80]">
                {search || status !== "all"
                  ? "Não encontramos dispositivos com os filtros selecionados."
                  : "Os dispositivos aparecerão aqui assim que uma licença for ativada em um computador ou celular."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
