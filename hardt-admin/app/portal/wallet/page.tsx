"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  LoaderCircle,
  Plus,
  QrCode,
  RefreshCcw,
  WalletCards,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createWalletTopup,
  getWallet,
  getWalletTransactions,
  reconcileWalletTopup,
} from "@/lib/api/client-wallet";

import type {
  Wallet,
  WalletTopup,
  WalletTransaction,
} from "@/lib/api/client-wallet";


function formatMoney(value: string | number): string {
  const amount = Number(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}


function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}


function TopupModal({
  onClose,
  onPaid,
}: {
  onClose: () => void;
  onPaid: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("50");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");

  const [topup, setTopup] =
    useState<WalletTopup | null>(null);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] =
    useState(false);


  async function submitTopup() {
    const numericAmount = Number(
      amount.replace(",", "."),
    );

    if (
      !Number.isFinite(numericAmount)
      || numericAmount <= 0
    ) {
      setError("Informe um valor válido.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await createWalletTopup({
        amount: numericAmount,
        ...(needsProfile || cpfCnpj
          ? { cpf_cnpj: cpfCnpj }
          : {}),
        ...(needsProfile || mobilePhone
          ? { mobile_phone: mobilePhone }
          : {}),
      });

      setTopup(result);
    } catch (requestError: any) {
      const detail =
        requestError?.response?.data?.detail;

      if (
        requestError?.response?.status === 409
        && detail?.code ===
          "PAYMENT_PROFILE_REQUIRED"
      ) {
        setNeedsProfile(true);

        setError(
          "Informe CPF/CNPJ e celular para realizar sua primeira recarga.",
        );

        return;
      }

      if (typeof detail === "string") {
        setError(detail);
        return;
      }

      setError(
        detail?.message
          ?? "Não foi possível gerar o PIX.",
      );
    } finally {
      setLoading(false);
    }
  }


  async function copyPix() {
    if (!topup?.pix_copy_paste) {
      return;
    }

    await navigator.clipboard.writeText(
      topup.pix_copy_paste,
    );

    setCopied(true);

    window.setTimeout(
      () => setCopied(false),
      1800,
    );
  }


  async function checkPayment() {
    if (!topup) {
      return;
    }

    setChecking(true);

    try {
      const reconciledTopup =
        await reconcileWalletTopup(topup.id);

      if (reconciledTopup.status === "paid") {
        await onPaid();
      }
    } catch (error) {
      console.error(
        "Erro ao reconciliar pagamento:",
        error,
      );
    } finally {
      setChecking(false);
    }
  }


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#111116] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-white/50 transition hover:bg-white/[0.09] hover:text-white"
          aria-label="Fechar"
        >
          <X size={19} />
        </button>

        <div className="border-b border-white/[0.06] px-7 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
            <QrCode size={24} />
          </div>

          <h2 className="mt-5 text-xl font-black text-white">
            Adicionar saldo
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/40">
            Gere um PIX e adicione créditos à sua
            carteira Hardt.
          </p>
        </div>

        <div className="px-7 py-6">
          {!topup ? (
            <>
              <label className="text-sm font-semibold text-white/70">
                Valor da recarga
              </label>

              <div className="mt-2 flex items-center rounded-2xl border border-white/[0.08] bg-black/20 px-4">
                <span className="text-sm font-bold text-white/35">
                  R$
                </span>

                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  inputMode="decimal"
                  className="h-14 flex-1 bg-transparent px-3 text-lg font-bold text-white outline-none"
                  placeholder="50,00"
                />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {[20, 50, 100, 200].map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setAmount(String(value))
                      }
                      className="rounded-xl border border-white/[0.07] bg-white/[0.035] py-2.5 text-xs font-semibold text-white/55 transition hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
                    >
                      R$ {value}
                    </button>
                  ),
                )}
              </div>

              {needsProfile && (
                <div className="mt-6 space-y-4 rounded-2xl border border-violet-500/15 bg-violet-500/[0.05] p-4">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Complete seu perfil de pagamento
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/40">
                      Estes dados são necessários somente
                      para criar seu cadastro de cobrança.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/55">
                      CPF ou CNPJ
                    </label>

                    <input
                      value={cpfCnpj}
                      onChange={(event) =>
                        setCpfCnpj(
                          event.target.value,
                        )
                      }
                      className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-500/40"
                      placeholder="Digite seu CPF ou CNPJ"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/55">
                      Celular
                    </label>

                    <input
                      value={mobilePhone}
                      onChange={(event) =>
                        setMobilePhone(
                          event.target.value,
                        )
                      }
                      className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-500/40"
                      placeholder="11987654321"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/[0.07] px-4 py-3 text-xs leading-5 text-red-300">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={submitTopup}
                className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <QrCode size={18} />
                )}

                Gerar PIX
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/15 bg-amber-400/10 text-amber-300">
                  <QrCode size={28} />
                </div>

                <p className="mt-4 text-sm text-white/45">
                  PIX gerado no valor de
                </p>

                <p className="mt-1 text-3xl font-black text-white">
                  {formatMoney(
                    topup.amount_brl,
                  )}
                </p>
              </div>

              {topup.pix_qr_code && (
                <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3">
                  <img
                    src={`data:image/png;base64,${topup.pix_qr_code}`}
                    alt="QR Code PIX"
                    className="h-44 w-44"
                  />
                </div>
              )}

              {topup.pix_copy_paste && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-white/50">
                    PIX Copia e Cola
                  </p>

                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                    <p className="min-w-0 flex-1 truncate text-xs text-white/50">
                      {topup.pix_copy_paste}
                    </p>

                    <button
                      type="button"
                      onClick={copyPix}
                      className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-violet-500/10 px-3 text-xs font-bold text-violet-300 transition hover:bg-violet-500/20"
                    >
                      {copied ? (
                        <>
                          <Check size={15} />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={15} />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-amber-400/10 bg-amber-400/[0.05] px-4 py-3 text-xs font-semibold text-amber-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
                Aguardando pagamento
              </div>

              <button
                type="button"
                disabled={checking}
                onClick={checkPayment}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
              >
                <RefreshCcw
                  size={17}
                  className={
                    checking
                      ? "animate-spin"
                      : ""
                  }
                />
                Atualizar saldo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default function WalletPage() {
  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [transactions, setTransactions] =
    useState<WalletTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTopup, setShowTopup] =
    useState(false);


  const loadWallet = useCallback(
    async () => {
      try {
        setError("");

        const [
          walletData,
          transactionsData,
        ] = await Promise.all([
          getWallet(),
          getWalletTransactions(),
        ]);

        setWallet(walletData);
        setTransactions(transactionsData);
      } catch {
        setError(
          "Não foi possível carregar sua carteira.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );


  useEffect(() => {
    loadWallet();
  }, [loadWallet]);


  async function handlePaid() {
    await loadWallet();
    setShowTopup(false);
  }


  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-violet-500" />
      </div>
    );
  }


  if (error || !wallet) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-300">
          {error || "Carteira não encontrada."}
        </div>
      </div>
    );
  }


  return (
    <>
      <div className="mx-auto w-full max-w-[1500px]">
        <section>
          <p className="text-sm font-semibold text-violet-400">
            HARDT WALLET
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Minha Carteira
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
            Adicione saldo e utilize seus créditos nos
            produtos e serviços da Hardt.
          </p>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="relative overflow-hidden rounded-[28px] border border-violet-500/20 bg-gradient-to-br from-[#171021] via-[#111116] to-[#0d0d12] p-7 shadow-[0_24px_80px_rgba(76,29,149,0.16)]">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
                  <WalletCards size={23} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                    Saldo disponível
                  </p>

                  <p className="mt-1 text-sm text-white/40">
                    Hardt Wallet
                  </p>
                </div>
              </div>

              <p className="mt-8 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {formatMoney(wallet.balance)}
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowTopup(true)
                }
                className="mt-8 flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(124,58,237,0.25)] transition hover:bg-violet-500"
              >
                <Plus size={18} />
                Adicionar saldo
              </button>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/[0.07] bg-[#111116] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-bold text-white">
              Carteira unificada
            </p>

            <p className="mt-3 text-sm leading-6 text-white/40">
              Seu saldo poderá ser utilizado em produtos
              e serviços integrados ao ecossistema Hardt.
            </p>

            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
              <p className="text-xs font-semibold text-white/35">
                FORMA DE RECARGA
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <QrCode size={19} />
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    PIX
                  </p>

                  <p className="text-xs text-white/35">
                    Crédito após confirmação
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#111116] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
            <div>
              <h2 className="text-lg font-black text-white">
                Extrato
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Movimentações da sua carteira
              </p>
            </div>

            <button
              type="button"
              onClick={loadWallet}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/45 transition hover:text-violet-300"
              aria-label="Atualizar extrato"
            >
              <RefreshCcw size={17} />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <WalletCards
                size={36}
                className="mx-auto text-violet-400/40"
              />

              <p className="mt-4 font-bold text-white">
                Nenhuma movimentação
              </p>

              <p className="mt-2 text-sm text-white/35">
                Suas recargas e utilizações aparecerão
                aqui.
              </p>
            </div>
          ) : (
            <div>
              {transactions.map(
                (transaction) => {
                  const credit =
                    transaction.type === "credit";

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-5 border-b border-white/[0.055] px-6 py-5 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            credit
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {credit ? (
                            <ArrowDownLeft
                              size={20}
                            />
                          ) : (
                            <ArrowUpRight
                              size={20}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {transaction.description
                              ?? (
                                credit
                                  ? "Crédito na carteira"
                                  : "Utilização de saldo"
                              )}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            {formatDate(
                              transaction.created_at,
                            )}
                          </p>
                        </div>
                      </div>

                      <p
                        className={`shrink-0 text-sm font-black ${
                          credit
                            ? "text-emerald-300"
                            : "text-white"
                        }`}
                      >
                        {credit ? "+" : "-"}
                        {formatMoney(
                          transaction.amount,
                        )}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      {showTopup && (
        <TopupModal
          onClose={() =>
            setShowTopup(false)
          }
          onPaid={handlePaid}
        />
      )}
    </>
  );
}
