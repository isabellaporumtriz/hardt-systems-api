"use client";

import axios from "axios";
import {
  KeyRound,
  LoaderCircle,
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
import { saveAccessToken } from "@/lib/auth";


export default function LoginPage() {
  const router = useRouter();

  const {
    user,
    isLoading,
    refreshUser,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);


  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    router.replace(
      user.is_admin
        ? "/dashboard"
        : "/portal/dashboard"
    );
  }, [
    user,
    isLoading,
    router,
  ]);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const result = await login({
        email,
        password,
      });

      saveAccessToken(result.access_token);

      const currentUser =
        await refreshUser();

      router.replace(
        currentUser.is_admin
          ? "/dashboard"
          : "/portal/dashboard"
      );
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(
          requestError.response?.data?.detail
            ?? "Não foi possível entrar no Hardt Systems."
        );
      } else {
        setError(
          "Não foi possível entrar no Hardt Systems."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }


  if (isLoading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <LoaderCircle className="animate-spin text-violet-500" />
      </main>
    );
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(124,58,237,0.18),transparent_35%)]" />

      <section className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-400">
            <KeyRound size={25} />
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
            Hardt
            <span className="text-violet-500">
              {" "}
              Systems
            </span>
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Acesse sua conta no Hardt OS.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7 shadow-2xl shadow-black/20"
        >
          <div>
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
                setEmail(event.target.value)
              }
              placeholder="seu@email.com"
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
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Digite sua senha"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
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
                Entrando...
              </>
            ) : (
              "Entrar no Hardt OS"
            )}
          </button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Ainda não possui uma conta?{" "}
            <Link
              href="/register"
              className="font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Criar conta
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
