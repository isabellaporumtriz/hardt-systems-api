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
    <div className="min-h-full text-white">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-violet-400">
              Central de arquivos
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Downloads
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Baixe os produtos disponíveis para suas licenças
              e acesse sempre as versões mais recentes.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void loadDownloads(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#111116] px-4 text-sm font-semibold text-white/70 shadow-sm transition hover:border-violet-500/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
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
          <article className="rounded-[24px] border border-white/[0.07] bg-[#111116] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/45">
                  Downloads disponíveis
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                  {summary.total}
                </p>

                <p className="mt-1 text-xs text-white/35">
                  Arquivos liberados para sua conta
                </p>
              </div>

              <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-400">
                <HardDriveDownload className="h-5 w-5" />
              </div>
            </div>
          </article>

          <article className="rounded-[24px] border border-white/[0.07] bg-[#111116] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/45">
                  Produtos
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                  {summary.products}
                </p>

                <p className="mt-1 text-xs text-white/35">
                  Produtos vinculados às suas licenças
                </p>
              </div>

              <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-400">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </article>

          <article className="rounded-[24px] border border-white/[0.07] bg-[#111116] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/45">
                  Plataformas
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                  {summary.platforms}
                </p>

                <p className="mt-1 text-xs text-white/35">
                  Sistemas operacionais disponíveis
                </p>
              </div>

              <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-400">
                <Monitor className="h-5 w-5" />
              </div>
            </div>
          </article>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{error}</span>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#111116] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
          <div className="space-y-4 border-b border-white/[0.06] p-4 lg:flex lg:items-center lg:justify-between lg:space-y-0">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Buscar produto, versão ou arquivo..."
                className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>

            <div className="flex max-w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
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
                        ? "bg-violet-600 text-white shadow-md shadow-violet-950/40"
                        : "text-white/35 hover:text-white"
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
              <LoaderCircle className="h-8 w-8 animate-spin text-violet-400" />

              <p className="text-sm font-medium text-white/45">
                Carregando seus downloads...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-violet-400">
                <Archive className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-white">
                Nenhum download encontrado
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
                Quando um arquivo estiver disponível para os
                produtos das suas licenças, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex min-h-[310px] flex-col rounded-[24px] border border-white/[0.07] bg-[#111116] p-5 transition hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-[0_15px_35px_rgba(76,42,125,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-400">
                        <FileArchive className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-white">
                          {item.product_name}
                        </h2>

                        <p className="mt-1 truncate text-xs text-white/35">
                          {item.file_name}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-300">
                      v{item.version}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-[#111116] p-3">
                      <p className="text-xs text-white/35">
                        Plataforma
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white/80">
                        {getPlatformLabel(item.platform)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-[#111116] p-3">
                      <p className="text-xs text-white/35">
                        Arquitetura
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white/80">
                        {item.architecture || "Universal"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-[#111116] p-3">
                      <p className="text-xs text-white/35">
                        Tamanho
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white/80">
                        {formatFileSize(item.file_size_bytes)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-[#111116] p-3">
                      <p className="text-xs text-white/35">
                        Publicação
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white/80">
                        {formatDate(item.published_at)}
                      </p>
                    </div>
                  </div>

                  {item.release_notes ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/45">
                      {item.release_notes}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-white/35">
                      Versão pronta para instalação.
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={downloadingId === item.id}
                    onClick={() =>
                      void handleDownload(item)
                    }
                    className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
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
            <footer className="flex flex-col gap-3 border-t border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/40">
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
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/[0.09] bg-[#111116] px-3 text-sm font-semibold text-white/55 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                <span className="px-2 text-sm font-semibold text-white/55">
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
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/[0.09] bg-[#111116] px-3 text-sm font-semibold text-white/55 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          ) : null}
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#111116] p-4">
          <Box className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />

          <p className="text-sm leading-6 text-white/45">
            Somente produtos vinculados a licenças ativas ou
            aguardando ativação serão exibidos nesta página.
          </p>
        </div>
      </div>
    </div>
  );
}
