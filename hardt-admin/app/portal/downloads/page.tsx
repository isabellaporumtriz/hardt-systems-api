"use client";

import {
  Archive,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileArchive,
  HardDriveDownload,
  LoaderCircle,
  Monitor,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  getClientDownloadAccess,
  getClientDownloads,
} from "@/lib/api/client-downloads";

import type {
  ClientDownloadItem,
  ClientDownloadListResponse,
} from "@/lib/types/client-downloads";

const PAGE_SIZE = 12;

const PLATFORM_FILTERS = [
  {
    label: "Todos",
    value: "",
  },
  {
    label: "Windows",
    value: "windows",
  },
  {
    label: "macOS",
    value: "macos",
  },
  {
    label: "Linux",
    value: "linux",
  },
];

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) {
    return "Tamanho não informado";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = unitIndex === 0 ? 0 : 1;

  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPlatformLabel(platform: string): string {
  const normalized = platform.trim().toLowerCase();

  if (normalized === "windows") {
    return "Windows";
  }

  if (
    normalized === "macos" ||
    normalized === "mac" ||
    normalized === "darwin"
  ) {
    return "macOS";
  }

  if (normalized === "linux") {
    return "Linux";
  }

  return platform;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string;
          };
        };
      }
    ).response;

    if (response?.data?.detail) {
      return response.data.detail;
    }
  }

  return "Não foi possível carregar os downloads.";
}

export default function DownloadsPage() {
  const [data, setData] =
    useState<ClientDownloadListResponse | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadDownloads = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        const response = await getClientDownloads({
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          platform: platform || undefined,
        });

        setData(response);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, platform, search],
  );

  useEffect(() => {
    void loadDownloads();
  }, [loadDownloads]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  async function handleDownload(
    item: ClientDownloadItem,
  ): Promise<void> {
    try {
      setDownloadingId(item.id);
      setError(null);

      const access = await getClientDownloadAccess(item.id);

      window.open(
        access.file_url,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setDownloadingId(null);
    }
  }

  function changePlatform(value: string): void {
    setPage(1);
    setPlatform(value);
  }

  const summary = data?.summary ?? {
    total: 0,
    products: 0,
    platforms: 0,
  };

  const items = data?.items ?? [];
  const totalPages = data?.pages ?? 0;

  return (
    <div className="min-h-full text-[#211633]">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#7c2cff]">
              Central de arquivos
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#211633] md:text-4xl">
              Downloads
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f687c]">
              Baixe os produtos disponíveis para suas licenças
              e acesse sempre as versões mais recentes.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void loadDownloads(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e6dff0] bg-white px-4 text-sm font-semibold text-[#4a4058] shadow-sm transition hover:border-[#b897f5] hover:bg-[#f8f4ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />

            Atualizar
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6f687c]">
                  Downloads disponíveis
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-[#211633]">
                  {summary.total}
                </p>

                <p className="mt-1 text-xs text-[#81798d]">
                  Arquivos liberados para sua conta
                </p>
              </div>

              <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                <HardDriveDownload className="h-5 w-5" />
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6f687c]">
                  Produtos
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-[#211633]">
                  {summary.products}
                </p>

                <p className="mt-1 text-xs text-[#81798d]">
                  Produtos vinculados às suas licenças
                </p>
              </div>

              <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#ebe6f2] bg-white p-5 shadow-[0_12px_35px_rgba(48,31,77,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6f687c]">
                  Plataformas
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-[#211633]">
                  {summary.platforms}
                </p>

                <p className="mt-1 text-xs text-[#81798d]">
                  Sistemas operacionais disponíveis
                </p>
              </div>

              <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                <Monitor className="h-5 w-5" />
              </div>
            </div>
          </article>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{error}</span>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-[#ebe6f2] bg-white shadow-[0_16px_45px_rgba(48,31,77,0.07)]">
          <div className="space-y-4 border-b border-[#eee9f4] p-4 lg:flex lg:items-center lg:justify-between lg:space-y-0">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8497]" />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Buscar produto, versão ou arquivo..."
                className="h-11 w-full rounded-xl border border-[#ded7e7] bg-[#fbfaff] pl-10 pr-4 text-sm text-[#211633] outline-none transition placeholder:text-[#96909f] focus:border-[#8a3ffc] focus:ring-2 focus:ring-[#8a3ffc]/10"
              />
            </div>

            <div className="flex max-w-full overflow-x-auto rounded-xl border border-[#e4deeb] bg-[#f3f0f6] p-1">
              {PLATFORM_FILTERS.map((filter) => {
                const isSelected =
                  platform === filter.value;

                return (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() =>
                      changePlatform(filter.value)
                    }
                    className={`h-9 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${
                      isSelected
                        ? "bg-[#7c2cff] text-white shadow-md shadow-purple-200"
                        : "text-[#81798d] hover:text-[#211633]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-[#7c2cff]" />

              <p className="text-sm font-medium text-[#6f687c]">
                Carregando seus downloads...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="rounded-2xl border border-[#dccdff] bg-[#f1eaff] p-4 text-[#7c2cff]">
                <Archive className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-[#211633]">
                Nenhum download encontrado
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#756d80]">
                Quando um arquivo estiver disponível para os
                produtos das suas licenças, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex min-h-[310px] flex-col rounded-2xl border border-[#ebe6f2] bg-[#fdfcff] p-5 transition hover:-translate-y-0.5 hover:border-[#d8c5fb] hover:shadow-[0_15px_35px_rgba(76,42,125,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                        <FileArchive className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-[#211633]">
                          {item.product_name}
                        </h2>

                        <p className="mt-1 truncate text-xs text-[#81798d]">
                          {item.file_name}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full border border-[#ded1f9] bg-[#f4edff] px-2.5 py-1 text-xs font-bold text-[#7133d5]">
                      v{item.version}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#eee9f4] bg-white p-3">
                      <p className="text-xs text-[#81798d]">
                        Plataforma
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#393044]">
                        {getPlatformLabel(item.platform)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#eee9f4] bg-white p-3">
                      <p className="text-xs text-[#81798d]">
                        Arquitetura
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#393044]">
                        {item.architecture || "Universal"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#eee9f4] bg-white p-3">
                      <p className="text-xs text-[#81798d]">
                        Tamanho
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#393044]">
                        {formatFileSize(item.file_size_bytes)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#eee9f4] bg-white p-3">
                      <p className="text-xs text-[#81798d]">
                        Publicação
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#393044]">
                        {formatDate(item.published_at)}
                      </p>
                    </div>
                  </div>

                  {item.release_notes ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#6f687c]">
                      {item.release_notes}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-[#81798d]">
                      Versão pronta para instalação.
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={downloadingId === item.id}
                    onClick={() =>
                      void handleDownload(item)
                    }
                    className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7c2cff] px-4 text-sm font-bold text-white shadow-lg shadow-purple-200 transition hover:bg-[#6b20e8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingId === item.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}

                    {downloadingId === item.id
                      ? "Preparando..."
                      : "Baixar arquivo"}
                  </button>
                </article>
              ))}
            </div>
          )}

          {!isLoading && items.length > 0 ? (
            <footer className="flex flex-col gap-3 border-t border-[#eee9f4] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#756d80]">
                Exibindo {items.length} de {data?.total ?? 0}{" "}
                arquivos
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#ded7e7] bg-white px-3 text-sm font-semibold text-[#51495d] transition hover:bg-[#f6f2fb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                <span className="px-2 text-sm font-semibold text-[#51495d]">
                  {page} de {Math.max(totalPages, 1)}
                </span>

                <button
                  type="button"
                  disabled={
                    totalPages === 0 ||
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#ded7e7] bg-white px-3 text-sm font-semibold text-[#51495d] transition hover:bg-[#f6f2fb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          ) : null}
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-[#e6dff0] bg-[#faf8fd] p-4">
          <Box className="mt-0.5 h-5 w-5 shrink-0 text-[#7c2cff]" />

          <p className="text-sm leading-6 text-[#6f687c]">
            Somente produtos vinculados a licenças ativas ou
            aguardando ativação serão exibidos nesta página.
          </p>
        </div>
      </div>
    </div>
  );
}
