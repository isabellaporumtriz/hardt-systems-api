"use client";

import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Loader2,
  PackagePlus,
  RefreshCcw,
  Upload,
} from "lucide-react";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addInventoryItem,
  getProductStock,
} from "@/lib/api/inventory";

import { getProduct } from "@/lib/api/products";

import type { Product } from "@/lib/types/api";


type ImportResult = {
  success: number;
  errors: string[];
};


function parseLine(
  line: string
): Record<string, unknown> {
  const trimmed = line.trim();

  if (!trimmed) {
    throw new Error("Linha vazia.");
  }

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "O JSON precisa ser um objeto."
      );
    }

    return parsed as Record<string, unknown>;
  }

  const parts = trimmed.split("|");

  if (parts.length < 2) {
    throw new Error(
      "Use JSON ou campos separados por |."
    );
  }

  const [
    login,
    password,
    email,
    email_password,
    two_factor,
    cookies,
    notes,
  ] = parts;

  return {
    login: login?.trim() || "",
    password: password?.trim() || "",
    email: email?.trim() || "",
    email_password:
      email_password?.trim() || "",
    two_factor: two_factor?.trim() || "",
    cookies: cookies?.trim() || "",
    notes: notes?.trim() || "",
  };
}


export default function ProductInventoryPage() {
  const params = useParams();

  const productId = String(params.id);

  const [product, setProduct] =
    useState<Product | null>(null);

  const [stock, setStock] = useState({
    available: 0,
    sold: 0,
    total: 0,
  });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [rawItems, setRawItems] =
    useState("");

  const [result, setResult] =
    useState<ImportResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);


  const parsedCount = useMemo(() => {
    return rawItems
      .split("\n")
      .filter((line) => line.trim())
      .length;
  }, [rawItems]);


  const loadData = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const [productData, stockData] =
          await Promise.all([
            getProduct(productId),
            getProductStock(productId),
          ]);

        setProduct(productData);
        setStock({
          available: stockData.available,
          sold: stockData.sold,
          total: stockData.total,
        });
      } catch (err) {
        console.error(err);

        setError(
          "Não foi possível carregar o estoque."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [productId]
  );


  useEffect(() => {
    void loadData();
  }, [loadData]);


  async function handleImport() {
    const lines = rawItems
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError(
        "Cole pelo menos um item para importar."
      );
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    let success = 0;
    const errors: string[] = [];

    for (
      let index = 0;
      index < lines.length;
      index += 1
    ) {
      const line = lines[index];

      try {
        const payload = parseLine(line);

        await addInventoryItem(
          productId,
          payload
        );

        success += 1;
      } catch (err) {
        console.error(err);

        errors.push(
          `Linha ${index + 1}: ${
            err instanceof Error
              ? err.message
              : "erro desconhecido"
          }`
        );
      }
    }

    setResult({
      success,
      errors,
    });

    if (success > 0) {
      setRawItems("");
      await loadData(true);
    }

    setImporting(false);
  }


  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          size={30}
          className="animate-spin text-violet-400"
        />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar para produtos
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                <Boxes
                  size={23}
                  className="text-violet-400"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-violet-400">
                  Controle de estoque
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {product?.name ?? "Produto"}
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
              Cadastre os acessos que serão
              entregues automaticamente após
              uma compra concluída.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-violet-500/30 hover:text-white disabled:opacity-50"
          >
            <RefreshCcw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            Atualizar
          </button>
        </div>
      </div>


      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}


      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Disponíveis
          </p>

          <p className="mt-3 text-4xl font-bold text-white">
            {stock.available}
          </p>

          <p className="mt-2 text-sm text-emerald-400">
            Prontos para venda
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Vendidos
          </p>

          <p className="mt-3 text-4xl font-bold text-white">
            {stock.sold}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Entregues aos clientes
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Total cadastrado
          </p>

          <p className="mt-3 text-4xl font-bold text-white">
            {stock.total}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Disponíveis + vendidos
          </p>
        </div>
      </div>


      <div className="rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-7 py-6">
          <div className="flex items-center gap-3">
            <PackagePlus
              size={21}
              className="text-violet-400"
            />

            <div>
              <h2 className="font-semibold text-white">
                Adicionar ao estoque
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Um item por linha. Os dados
                serão enviados ao backend para
                armazenamento protegido.
              </p>
            </div>
          </div>
        </div>


        <div className="space-y-6 p-7">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-sm font-medium text-zinc-300">
              Formato simples
            </p>

            <code className="mt-3 block overflow-x-auto rounded-xl bg-black/30 p-4 text-xs leading-6 text-zinc-400">
              login|senha|email|senha_email|2fa|cookies|observações
            </code>

            <p className="mt-4 text-xs leading-5 text-zinc-600">
              Também é aceito um objeto JSON
              completo por linha para estoques
              com campos diferentes.
            </p>
          </div>


          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">
                Itens
              </label>

              <span className="text-xs text-zinc-500">
                {parsedCount}{" "}
                {parsedCount === 1
                  ? "item"
                  : "itens"}
              </span>
            </div>

            <textarea
              value={rawItems}
              onChange={(event) =>
                setRawItems(event.target.value)
              }
              rows={12}
              spellCheck={false}
              placeholder={"usuario1|senha1|email1@example.com|senhaEmail|2FA|cookies|observação\nusuario2|senha2|email2@example.com|senhaEmail|2FA|cookies|observação"}
              className="w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 font-mono text-sm leading-6 text-zinc-300 outline-none transition placeholder:text-zinc-700 focus:border-violet-500/50"
            />
          </div>


          {result && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={18} />

                <span className="font-medium">
                  {result.success} importado(s)
                  com sucesso
                </span>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4 space-y-1 text-xs text-red-300">
                  {result.errors
                    .slice(0, 10)
                    .map((item) => (
                      <p key={item}>
                        {item}
                      </p>
                    ))}

                  {result.errors.length >
                    10 && (
                    <p>
                      +{" "}
                      {result.errors.length -
                        10}{" "}
                      outros erros
                    </p>
                  )}
                </div>
              )}
            </div>
          )}


          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={
                importing ||
                parsedCount === 0
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {importing ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Upload size={18} />
              )}

              {importing
                ? "Importando..."
                : `Importar ${parsedCount || ""} ${
                    parsedCount === 1
                      ? "item"
                      : "itens"
                  }`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
