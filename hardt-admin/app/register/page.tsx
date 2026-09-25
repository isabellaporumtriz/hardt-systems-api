"use client";

import axios from "axios";
import {
  KeyRound,
  LoaderCircle,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { login } from "@/lib/api/auth";
import {
  createOneTimeCheckout,
  type OneTimeCheckoutResponse,
} from "@/lib/api/billing";
import { registerUser } from "@/lib/api/registration";
import { saveAccessToken } from "@/lib/auth";

const HARDT_MEET_PRODUCT_SLUG = "hardt-meet";

export default function RegisterPage() {
  const router = useRouter();

  const {
    user,
    isLoading,
  } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [mobilePhone, setMobilePhone] =
    useState("");
  const [cpfCnpj, setCpfCnpj] =
    useState("");
  const [couponCode, setCouponCode] =
    useState("");

  const [pixCheckout, setPixCheckout] =
    useState<OneTimeCheckoutResponse | null>(
      null,
    );

  const [copied, setCopied] =
    useState(false);

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState("");

  useEffect(() => {
    if (
      isLoading
      || !user
      || isSubmitting
      || pixCheckout
    ) {
      return;
    }

    router.replace(
      user.is_admin
        ? "/dashboard"
        : "/portal/dashboard",
    );
  }, [
    user,
    isLoading,
    isSubmitting,
    router,
    pixCheckout,
  ]);

  function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setStatusMessage("");

    const normalizedName = name.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedPhone =
      onlyDigits(mobilePhone);

    const normalizedCpfCnpj =
      onlyDigits(cpfCnpj);

    if (normalizedName.length < 2) {
      setError(
        "Informe um nome com pelo menos 2 caracteres.",
      );
      return;
    }

    if (
      normalizedPhone.length !== 10
      && normalizedPhone.length !== 11
    ) {
      setError(
        "Informe um celular válido com DDD.",
      );
      return;
    }

    if (
      normalizedCpfCnpj.length !== 11
      && normalizedCpfCnpj.length !== 14
    ) {
      setError(
        "Informe um CPF ou CNPJ válido.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "A senha deve ter pelo menos 8 caracteres.",
      );
      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setError(
        "As senhas informadas não são iguais.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      setStatusMessage(
        "Criando sua conta...",
      );

      await registerUser({
        name: normalizedName,
        email: normalizedEmail,
        password,
      });

      setStatusMessage(
        "Preparando seu acesso...",
      );

      const loginResult =
        await login({
          email: normalizedEmail,
          password,
        });

      saveAccessToken(
        loginResult.access_token,
      );

      setStatusMessage(
        "Criando seu pagamento...",
      );

      const checkout =
        await createOneTimeCheckout({
          product_slug:
            HARDT_MEET_PRODUCT_SLUG,
          mobile_phone:
            normalizedPhone,
          cpf_cnpj:
            normalizedCpfCnpj,
          coupon_code:
            couponCode.trim()
              ? couponCode.trim().toUpperCase()
              : undefined,
        });

      if (!checkout.pix_copy_paste) {
        throw new Error(
          "Não foi possível gerar o PIX.",
        );
      }

      setPixCheckout(checkout);
      setStatusMessage("");
    } catch (requestError) {
      console.error(
        "ERRO CLIENTE ZERO:",
        requestError,
      );

      if (axios.isAxiosError(requestError)) {
        console.error(
          "STATUS:",
          requestError.response?.status,
        );

        console.error(
          "DATA:",
          requestError.response?.data,
        );

        console.error(
          "URL:",
          requestError.config?.url,
        );

        console.error(
          "BASE URL:",
          requestError.config?.baseURL,
        );
      }
      if (
        axios.isAxiosError(
          requestError,
        )
      ) {
        const detail =
          requestError.response
            ?.data?.detail;

        if (
          typeof detail === "string"
        ) {
          setError(detail);
        } else if (
          typeof detail === "object"
          && detail !== null
          && "message" in detail
        ) {
          setError(
            String(detail.message),
          );
        } else if (
          Array.isArray(detail)
          && detail.length > 0
        ) {
          setError(
            detail[0]?.msg
              ?? "Não foi possível continuar.",
          );
        } else {
          setError(
            "Não foi possível concluir o cadastro e iniciar o pagamento.",
          );
        }
      } else if (
        requestError instanceof Error
      ) {
        setError(
          requestError.message,
        );
      } else {
        setError(
          "Não foi possível concluir o cadastro e iniciar o pagamento.",
        );
      }

      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (
    isLoading
    || (user && !pixCheckout)
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <LoaderCircle
          className="animate-spin text-violet-500"
          size={28}
        />
      </main>
    );
  }

  if (pixCheckout) {
    const activePixCheckout = pixCheckout;

    const formattedAmount =
      new Intl.NumberFormat(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL",
        },
      ).format(
        Number(activePixCheckout.amount),
      );

    async function copyPixCode() {
      await navigator.clipboard.writeText(
        activePixCheckout.pix_copy_paste,
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        2000,
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-white">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7 text-center shadow-2xl shadow-black/20">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
            Hardt Meet
          </div>

          <h1 className="mt-3 text-2xl font-semibold">
            Pague com PIX
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Escaneie o QR Code ou copie o código PIX.
          </p>

          {activePixCheckout.applied_coupon && (
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Cupom{" "}
              <strong>
                {activePixCheckout.applied_coupon}
              </strong>{" "}
              aplicado ✓
            </div>
          )}

          <div className="mt-6 text-3xl font-semibold text-white">
            {formattedAmount}
          </div>

          {activePixCheckout.applied_coupon && (
            <div className="mt-1 text-sm text-zinc-500 line-through">
              R$ 139,90
            </div>
          )}

          {activePixCheckout.pix_qr_code && (
            <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4">
              <img
                src={`data:image/png;base64,${activePixCheckout.pix_qr_code}`}
                alt="QR Code PIX Hardt Meet"
                className="h-52 w-52"
              />
            </div>
          )}

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              PIX Copia e Cola
            </p>

            <p className="mt-2 max-h-24 overflow-auto break-all text-xs text-zinc-300">
              {activePixCheckout.pix_copy_paste}
            </p>
          </div>

          <button
            type="button"
            onClick={copyPixCode}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            {copied
              ? "Código PIX copiado ✓"
              : "Copiar código PIX"}
          </button>

          <button
            type="button"
            onClick={() =>
              window.location.assign(
                "/portal/licenses",
              )
            }
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
          >
            Já paguei — Ver minha licença
          </button>

          <p className="mt-5 text-xs leading-5 text-zinc-600">
            Após a confirmação do PIX, sua licença será
            liberada. Os 30 dias começam apenas na
            primeira ativação.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-white">
      <section className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-400">
            <UserPlus size={25} />
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
            Hardt
            <span className="text-violet-500">
              {" "}
              Systems
            </span>
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Crie sua conta e adquira o Hardt Meet
            com licença de 30 dias.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7 shadow-2xl shadow-black/20"
        >
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-zinc-300"
            >
              Nome
            </label>

            <input
              id="name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Seu nome"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-300"
            >
              E-mail
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="seu@email.com"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="mobilePhone"
              className="text-sm font-medium text-zinc-300"
            >
              Celular
            </label>

            <input
              id="mobilePhone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              value={mobilePhone}
              onChange={(event) =>
                setMobilePhone(
                  event.target.value,
                )
              }
              placeholder="(11) 99999-9999"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="cpfCnpj"
              className="text-sm font-medium text-zinc-300"
            >
              CPF ou CNPJ
            </label>

            <input
              id="cpfCnpj"
              type="text"
              required
              inputMode="numeric"
              autoComplete="off"
              value={cpfCnpj}
              onChange={(event) =>
                setCpfCnpj(
                  event.target.value,
                )
              }
              placeholder="CPF ou CNPJ"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="couponCode"
              className="text-sm font-medium text-zinc-300"
            >
              Cupom
              <span className="ml-1 text-zinc-600">
                (opcional)
              </span>
            </label>

            <input
              id="couponCode"
              type="text"
              maxLength={50}
              autoComplete="off"
              value={couponCode}
              onChange={(event) =>
                setCouponCode(
                  event.target.value.toUpperCase(),
                )
              }
              placeholder="Digite seu cupom"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm uppercase text-white outline-none transition placeholder:normal-case placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-300"
            >
              Senha
            </label>

            <input
              id="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Mínimo de 8 caracteres"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="passwordConfirmation"
              className="text-sm font-medium text-zinc-300"
            >
              Confirmar senha
            </label>

            <input
              id="passwordConfirmation"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={
                passwordConfirmation
              }
              onChange={(event) =>
                setPasswordConfirmation(
                  event.target.value,
                )
              }
              placeholder="Digite a senha novamente"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-300">
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                Processando...
              </>
            ) : (
              <>
                <KeyRound size={18} />
                Criar conta e continuar
              </>
            )}
          </button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Já possui uma conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Entrar
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Hardt Systems · Plataforma segura
        </p>
      </section>
    </main>
  );
}
