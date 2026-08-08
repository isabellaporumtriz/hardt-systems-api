"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Laptop,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type AdminDevice,
  getAdminDevices,
  removeDevice,
} from "@/lib/api/devices";


type DeviceFilter = "all" | "active" | "inactive";


function formatDate(value: string | null): string {
  if (!value) {
    return "Nunca";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}


function getDeviceName(device: AdminDevice): string {
  return (
    device.name?.trim()
    || device.device_identifier
    || "Dispositivo sem nome"
  );
}


function getOperatingSystem(
  operatingSystem: string | null,
): string {
  return operatingSystem?.trim() || "Não informado";
}


function truncateIdentifier(
  identifier: string,
  maxLength = 30,
): string {
  if (identifier.length <= maxLength) {
    return identifier;
  }

  return `${identifier.slice(0, maxLength)}...`;
}


export default function DevicesPage() {
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DeviceFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<
    string | null
  >(null);

  const [selectedDevice, setSelectedDevice] = useState<
    AdminDevice | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<
    string | null
  >(null);


  const loadDevices = useCallback(
    async (showRefresh = false) => {
      try {
        setError(null);

        if (showRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await getAdminDevices({
          limit: 500,
        });

        setDevices(response);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar os dispositivos.";

        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );


  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);


  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);


  const filteredDevices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesFilter =
        filter === "all"
        || (filter === "active" && device.is_active)
        || (filter === "inactive" && !device.is_active);

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableContent = [
        device.name,
        device.device_identifier,
        device.operating_system,
        device.license_number,
        device.user_name,
        device.user_email,
        device.product_name,
        device.product_slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableContent.includes(normalizedSearch);
    });
  }, [devices, filter, search]);


  const statistics = useMemo(() => {
    const active = devices.filter(
      (device) => device.is_active,
    ).length;

    const inactive = devices.length - active;

    const validated = devices.filter(
      (device) => Boolean(device.last_validated_at),
    ).length;

    return {
      total: devices.length,
      active,
      inactive,
      validated,
    };
  }, [devices]);


  async function handleRemoveDevice() {
    if (!selectedDevice) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setRemovingDeviceId(selectedDevice.id);

      const response = await removeDevice(
        selectedDevice.id,
      );

      setDevices((currentDevices) =>
        currentDevices.filter(
          (device) =>
            device.id !== response.device_id,
        ),
      );

      setSelectedDevice(null);
      setSuccessMessage(
        response.message
        || "Dispositivo desvinculado com sucesso.",
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível desvincular o dispositivo.";

      setError(message);
    } finally {
      setRemovingDeviceId(null);
    }
  }


  function clearFilters() {
    setSearch("");
    setFilter("all");
  }


  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
              <Monitor className="size-5 text-violet-400" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Gestão de acessos
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Dispositivos
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Visualize as máquinas vinculadas às licenças e
            libere vagas quando um cliente trocar de computador.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDevices(true)}
          disabled={isRefreshing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}

          Atualizar
        </button>
      </section>


      {error && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" />

            <div>
              <p className="text-sm font-semibold text-red-200">
                Ocorreu um erro
              </p>

              <p className="mt-1 text-sm text-red-300/80">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-lg p-1 text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
            aria-label="Fechar mensagem de erro"
          >
            <X className="size-4" />
          </button>
        </div>
      )}


      {successMessage && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />

            <div>
              <p className="text-sm font-semibold text-emerald-200">
                Tudo certo
              </p>

              <p className="mt-1 text-sm text-emerald-300/80">
                {successMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="rounded-lg p-1 text-emerald-300 transition hover:bg-emerald-500/10 hover:text-emerald-200"
            aria-label="Fechar mensagem de sucesso"
          >
            <X className="size-4" />
          </button>
        </div>
      )}


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          title="Total vinculado"
          value={statistics.total}
          description="Todos os dispositivos"
          icon={Laptop}
        />

        <StatisticCard
          title="Dispositivos ativos"
          value={statistics.active}
          description="Ocupando vagas"
          icon={ShieldCheck}
        />

        <StatisticCard
          title="Inativos"
          value={statistics.inactive}
          description="Sem acesso ativo"
          icon={AlertCircle}
        />

        <StatisticCard
          title="Já validados"
          value={statistics.validated}
          description="Com validação registrada"
          icon={CheckCircle2}
        />
      </section>


      <section className="rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar por cliente, produto, licença ou máquina..."
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"
            />
          </div>

          <div className="flex w-full gap-2 overflow-x-auto lg:w-auto">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Todos
            </FilterButton>

            <FilterButton
              active={filter === "active"}
              onClick={() => setFilter("active")}
            >
              Ativos
            </FilterButton>

            <FilterButton
              active={filter === "inactive"}
              onClick={() => setFilter("inactive")}
            >
              Inativos
            </FilterButton>
          </div>
        </div>


        {isLoading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
            <Loader2 className="size-8 animate-spin text-violet-400" />

            <div>
              <p className="font-medium text-zinc-200">
                Carregando dispositivos
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Buscando os vínculos cadastrados.
              </p>
            </div>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Monitor className="size-7 text-zinc-500" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">
              Nenhum dispositivo encontrado
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {devices.length === 0
                ? "Os dispositivos aparecerão aqui depois que uma licença for ativada em uma máquina."
                : "Nenhum dispositivo corresponde aos filtros selecionados."}
            </p>

            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1120px] text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-4">
                      Dispositivo
                    </th>

                    <th className="px-5 py-4">
                      Cliente
                    </th>

                    <th className="px-5 py-4">
                      Produto
                    </th>

                    <th className="px-5 py-4">
                      Licença
                    </th>

                    <th className="px-5 py-4">
                      Ativação
                    </th>

                    <th className="px-5 py-4">
                      Última validação
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      className="border-b border-white/[0.06] transition last:border-b-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                            <Laptop className="size-5 text-violet-400" />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate text-sm font-semibold text-zinc-100">
                              {getDeviceName(device)}
                            </p>

                            <p
                              title={device.device_identifier}
                              className="mt-1 max-w-[220px] truncate font-mono text-xs text-zinc-500"
                            >
                              {truncateIdentifier(
                                device.device_identifier,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {getOperatingSystem(
                                device.operating_system,
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-zinc-200">
                          {device.user_name}
                        </p>

                        <p className="mt-1 max-w-[210px] truncate text-xs text-zinc-500">
                          {device.user_email}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-zinc-200">
                          {device.product_name}
                        </p>

                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {device.product_slug}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-xs text-zinc-300">
                          {device.license_number}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <DateCell
                          value={device.activated_at}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <DateCell
                          value={
                            device.last_validated_at
                          }
                          emptyLabel="Nunca validado"
                        />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          isActive={device.is_active}
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDevice(device)
                          }
                          disabled={
                            removingDeviceId === device.id
                          }
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Desvincular dispositivo"
                          title="Desvincular dispositivo"
                        >
                          {removingDeviceId ===
                          device.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


            <div className="grid gap-4 p-4 xl:hidden">
              {filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isRemoving={
                    removingDeviceId === device.id
                  }
                  onRemove={() =>
                    setSelectedDevice(device)
                  }
                />
              ))}
            </div>


            <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Exibindo{" "}
                <span className="font-medium text-zinc-300">
                  {filteredDevices.length}
                </span>{" "}
                de{" "}
                <span className="font-medium text-zinc-300">
                  {devices.length}
                </span>{" "}
                dispositivos.
              </p>

              <p>
                {statistics.active} ativos e{" "}
                {statistics.inactive} inativos
              </p>
            </div>
          </>
        )}
      </section>


      {selectedDevice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-device-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!removingDeviceId) {
                setSelectedDevice(null);
              }
            }}
            aria-label="Fechar modal"
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <Trash2 className="size-5 text-red-400" />
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDevice(null)
                }
                disabled={Boolean(removingDeviceId)}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>

            <h2
              id="remove-device-title"
              className="mt-5 text-xl font-semibold text-white"
            >
              Desvincular dispositivo?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              A máquina será removida da licença e a vaga
              ocupada ficará disponível para uma nova
              ativação.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-medium text-zinc-100">
                {getDeviceName(selectedDevice)}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {selectedDevice.user_name}
                {" · "}
                {selectedDevice.product_name}
              </p>

              <p className="mt-3 font-mono text-xs text-zinc-500">
                {selectedDevice.license_number}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setSelectedDevice(null)
                }
                disabled={Boolean(removingDeviceId)}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleRemoveDevice()
                }
                disabled={Boolean(removingDeviceId)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removingDeviceId ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Desvinculando...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Desvincular
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


interface StatisticCardProps {
  title: string;
  value: number;
  description: string;
  icon: typeof Laptop;
}


function StatisticCard({
  title,
  value,
  description,
  icon: Icon,
}: StatisticCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-2 text-xs text-zinc-500">
            {description}
          </p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
          <Icon className="size-5 text-violet-400" />
        </div>
      </div>
    </div>
  );
}


interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}


function FilterButton({
  active,
  onClick,
  children,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-10 shrink-0 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition"
          : "h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.07] hover:text-zinc-200"
      }
    >
      {children}
    </button>
  );
}


function StatusBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Ativo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-400">
      <span className="size-1.5 rounded-full bg-zinc-500" />
      Inativo
    </span>
  );
}


function DateCell({
  value,
  emptyLabel = "Nunca",
}: {
  value: string | null;
  emptyLabel?: string;
}) {
  if (!value) {
    return (
      <span className="text-sm text-zinc-600">
        {emptyLabel}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Clock3 className="size-4 shrink-0 text-zinc-600" />

      <span className="whitespace-nowrap text-sm text-zinc-400">
        {formatDate(value)}
      </span>
    </div>
  );
}


interface DeviceCardProps {
  device: AdminDevice;
  isRemoving: boolean;
  onRemove: () => void;
}


function DeviceCard({
  device,
  isRemoving,
  onRemove,
}: DeviceCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <Laptop className="size-5 text-violet-400" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-semibold text-zinc-100">
              {getDeviceName(device)}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {getOperatingSystem(
                device.operating_system,
              )}
            </p>
          </div>
        </div>

        <StatusBadge isActive={device.is_active} />
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 size-4 shrink-0 text-zinc-600" />

          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-300">
              {device.user_name}
            </p>

            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {device.user_email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoBlock
            label="Produto"
            value={device.product_name}
          />

          <InfoBlock
            label="Licença"
            value={device.license_number}
            mono
          />

          <InfoBlock
            label="Ativado em"
            value={formatDate(device.activated_at)}
          />

          <InfoBlock
            label="Última validação"
            value={
              device.last_validated_at
                ? formatDate(
                    device.last_validated_at,
                  )
                : "Nunca"
            }
          />
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
            Identificador
          </p>

          <p
            title={device.device_identifier}
            className="mt-1 break-all font-mono text-xs leading-5 text-zinc-400"
          >
            {device.device_identifier}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-sm font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRemoving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}

        Desvincular dispositivo
      </button>
    </article>
  );
}


function InfoBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p
        className={
          mono
            ? "mt-1 truncate font-mono text-xs text-zinc-300"
            : "mt-1 truncate text-sm text-zinc-300"
        }
        title={value}
      >
        {value}
      </p>
    </div>
  );
}