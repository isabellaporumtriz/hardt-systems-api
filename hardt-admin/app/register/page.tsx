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
import { createOneTimeCheckout } from "@/lib/api/billing";
import { registerUser } from "@/lib/api/registration";
import { saveAccessToken } from "@/lib/auth";

const HARDT_MEET_PRODUCT_SLUG =
  "hardt-meet";

export default function RegisterPage() {
  const router = useRouter();

  const {
    user,
    isLoading,
  } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [cpfCnpj, setCpfCnpj] =
    useState("");

  const [mobilePhone, setMobilePhone] =
    useState("");

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
    if (isLoading || !user) {
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
    router,
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

    const normalizedDocument =
      onlyDigits(cpfCnpj);

    const normalizedPhone =
      onlyDigits(mobilePhone);

    if (normalizedName.length < 2) {
      setError(
        "Informe um nome com pelo menos 2 caracteres.",
      );
      return;
    }

    if (
      normalizedDocument.length !== 11
      && normalizedDocument.length !== 14
    ) {
      setError(
        "Informe um CPF ou CNPJ válido.",
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
        "Gerando sua cobrança...",
      );

      const checkout =
        await createOneTimeCheckout({
          product_slug:
            HARDT_MEET_PRODUCT_SLUG,

          cpf_cnpj:
            normalizedDocument,

          mobile_phone:
            normalizedPhone,
        });

      if (!checkout.invoice_url) {
        throw new Error(
          "O checkout não retornou o link de pagamento.",
        );
      }

      setStatusMessage(
        "Tudo pronto. Abrindo pagamento...",
      );

      window.location.assign(
        checkout.invoice_url,
      );
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
            "Não foi possível concluir o cadastro e pagamento.",
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
          "Não foi possível concluir o cadastro e pagamento.",
        );
      }

      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <LoaderCircle
          className="animate-spin text-violet-500"
          size={28}
        />
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
            Crie sua conta e continue
            para o pagamento do Hardt Meet.
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
