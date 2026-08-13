"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Package,
  ShoppingBag,
  WalletCards,
} from "lucide-react";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getStoreProducts,
  purchaseStoreProduct,
} from "@/lib/api/client-store";

import type {
  StoreProduct,
} from "@/lib/api/client-store";

import {
  getWallet,
} from "@/lib/api/client-wallet";


function formatMoney(
  value: string | number
): string {
  const amount = Number(value);

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number.isFinite(amount)
      ? amount
      : 0
  );
}


export default function StorePage() {
  const [products, setProducts] =
    useState<StoreProduct[]>([]);

  const [balance, setBalance] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [buyingId, setBuyingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * A key permanece associada ao produto
   * enquanto a tentativa não for concluída.
   * Assim retry manual reaproveita a mesma key.
   */
  const purchaseKeys =
    useRef<Record<string, string>>({});


  const loadData =
    useCallback(async () => {
      setError("");

      try {
        const [
          productData,
          walletData,
        ] = await Promise.all([
          getStoreProducts(),
          getWallet(),
        ]);

        setProducts(productData);
        setBalance(
          Number(walletData.balance)
        );
      } catch {
        setError(
          "Não foi possível carregar a loja."
        );
      } finally {
        setLoading(false);
      }
    }, []);


  useEffect(() => {
    void loadData();
  }, [loadData]);


  async function buyProduct(
    product: StoreProduct
  ) {
    setError("");
    setSuccess("");
    setBuyingId(product.id);

    let key =
      purchaseKeys.current[
        product.id
      ];

    if (!key) {
      key = `portal-${crypto.randomUUID()}`;

      purchaseKeys.current[
        product.id
      ] = key;
    }

    try {
      await purchaseStoreProduct(
        product.id,
        key
      );

      /*
       * Só apagamos a key após sucesso.
       */
      delete purchaseKeys.current[
        product.id
      ];

      setSuccess(
        `${product.name} comprado com sucesso.`
      );

      await loadData();
    } catch (requestError: any) {
      const detail =
        requestError?.response?.data?.detail;

      if (
        requestError?.response?.status
        === 402
      ) {
        setError(
          "Saldo insuficiente. Adicione saldo à sua carteira."
        );
      } else if (
        typeof detail === "string"
      ) {
        setError(detail);
      } else {
        setError(
          "Não foi possível concluir a compra. Tente novamente."
        );
      }
    } finally {
      setBuyingId(null);
    }
  }


  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle
          size={30}
          className="animate-spin text-violet-300"
        />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
            Hardt Store
          </p>

          <h1 className="mt-2 text-3xl font-black text-white">
            Loja
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Compre produtos disponíveis
            utilizando o saldo da sua
            carteira Hardt.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <WalletCards size={20} />
          </div>

          <div>
            <p className="text-xs text-white/35">
              Saldo disponível
            </p>

            <p className="mt-1 text-lg font-black text-white">
              {formatMoney(balance)}
            </p>
          </div>
        </div>
      </div>


      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertCircle size={18} />
          {error}
        </div>
      )}


      {success && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} />
            {success}
          </div>

          <Link
            href="/portal/purchases"
            className="font-bold text-white hover:underline"
          >
            Ver compra
          </Link>
        </div>
      )}


      {products.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] py-20 text-center">
          <Package
            size={36}
            className="mx-auto text-white/20"
          />

          <p className="mt-5 font-bold text-white/65">
            Nenhum produto disponível
          </p>

          <p className="mt-2 text-sm text-white/30">
            Novos produtos aparecerão
            aqui quando houver estoque.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {products.map(
            (product) => {
              const price =
                Number(product.price);

              const enoughBalance =
                balance >= price;

              const buying =
                buyingId === product.id;

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] transition hover:border-violet-400/20 hover:bg-white/[0.035]"
                >
                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                      <ShoppingBag
                        size={23}
                      />
                    </div>

                    <h2 className="mt-6 text-xl font-black text-white">
                      {product.name}
                    </h2>

                    <p className="mt-3 min-h-12 text-sm leading-6 text-white/40">
                      {product.description
                        || "Produto disponível para compra imediata."}
                    </p>

                    <div className="mt-7 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-white/30">
                          Preço
                        </p>

                        <p className="mt-1 text-2xl font-black text-white">
                          {formatMoney(
                            product.price
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-white/30">
                          Estoque
                        </p>

                        <p className="mt-1 font-bold text-emerald-300">
                          {
                            product.available_stock
                          }{" "}
                          disponível
                          {product.available_stock
                          === 1
                            ? ""
                            : "is"}
                        </p>
                      </div>
                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        void buyProduct(
                          product
                        )
                      }
                      disabled={
                        buying
                        || !enoughBalance
                      }
                      className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/25"
                    >
                      {buying ? (
                        <>
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                          Comprando...
                        </>
                      ) : enoughBalance ? (
                        <>
                          <ShoppingBag
                            size={18}
                          />
                          Comprar agora
                        </>
                      ) : (
                        "Saldo insuficiente"
                      )}
                    </button>

                    {!enoughBalance && (
                      <Link
                        href="/portal/wallet"
                        className="mt-3 block text-center text-xs font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Adicionar saldo
                      </Link>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
