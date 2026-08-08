"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getClientProfile,
  updateClientPassword,
  updateClientProfile,
} from "@/lib/api/client-profile";

import type {
  ClientProfile,
} from "@/lib/api/client-profile";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "HC";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`
    .toUpperCase();
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    typeof error === "object"
    && error !== null
    && "response" in error
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

  return fallback;
}

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<ClientProfile | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [isSavingPassword, setIsSavingPassword] =
    useState(false);

  const [profileError, setProfileError] =
    useState("");

  const [profileSuccess, setProfileSuccess] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getClientProfile();

        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      } catch (error) {
        setProfileError(
          getErrorMessage(
            error,
            "Não foi possível carregar seu perfil.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, []);

  const initials = useMemo(
    () => getInitials(profile?.name ?? name),
    [name, profile?.name],
  );

  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setProfileError("");
    setProfileSuccess("");

    if (name.trim().length < 2) {
      setProfileError(
        "Informe um nome com pelo menos 2 caracteres.",
      );
      return;
    }

    if (!email.trim()) {
      setProfileError("Informe seu e-mail.");
      return;
    }

    try {
      setIsSavingProfile(true);

      const response = await updateClientProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });

      setProfile(response.profile);
      setName(response.profile.name);
      setEmail(response.profile.email);
      setProfileSuccess(response.message);
    } catch (error) {
      setProfileError(
        getErrorMessage(
          error,
          "Não foi possível atualizar seu perfil.",
        ),
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError(
        "A nova senha deve ter pelo menos 8 caracteres.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "A confirmação da nova senha não confere.",
      );
      return;
    }

    try {
      setIsSavingPassword(true);

      const response = await updateClientPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(response.message);
    } catch (error) {
      setPasswordError(
        getErrorMessage(
          error,
          "Não foi possível alterar sua senha.",
        ),
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#7c2cff]" />

          <p className="text-sm font-medium text-[#6f687c]">
            Carregando perfil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full text-[#211633]">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#7c2cff]">
            Minha conta
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#211633] md:text-4xl">
            Perfil
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f687c]">
            Atualize seus dados pessoais e gerencie a segurança
            da sua conta Hardt Systems.
          </p>
        </header>

        {profileError && !profile ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{profileError}</span>
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <aside className="space-y-6">
            <article className="overflow-hidden rounded-2xl border border-[#ebe6f2] bg-white shadow-[0_16px_45px_rgba(48,31,77,0.07)]">
              <div className="bg-gradient-to-br from-[#341070] via-[#4c1d95] to-[#7c2cff] px-6 py-8 text-white">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-black shadow-xl backdrop-blur">
                  {initials}
                </div>

                <h2 className="mt-5 text-2xl font-bold">
                  {profile?.name ?? name}
                </h2>

                <p className="mt-1 text-sm text-violet-100">
                  {profile?.email ?? email}
                </p>
              </div>

              <div className="divide-y divide-[#eee9f4]">
                <div className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#7c2cff]" />

                    <span className="text-sm text-[#6f687c]">
                      Status da conta
                    </span>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      profile?.is_active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {profile?.is_active
                      ? "Ativa"
                      : "Inativa"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[#7c2cff]" />

                    <span className="text-sm text-[#6f687c]">
                      Conta criada
                    </span>
                  </div>

                  <span className="text-right text-sm font-semibold text-[#393044]">
                    {profile
                      ? formatDate(profile.created_at)
                      : "Não informado"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[#7c2cff]" />

                    <span className="text-sm text-[#6f687c]">
                      Última atualização
                    </span>
                  </div>

                  <span className="text-right text-sm font-semibold text-[#393044]">
                    {profile
                      ? formatDate(profile.updated_at)
                      : "Não informado"}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-[#e6dff0] bg-[#faf8fd] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#7c2cff]" />

                <div>
                  <h3 className="font-bold text-[#211633]">
                    Conta protegida
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#6f687c]">
                    Sua senha é armazenada de forma criptografada.
                    Nunca compartilhe suas credenciais de acesso.
                  </p>
                </div>
              </div>
            </article>
          </aside>

          <div className="space-y-6">
            <form
              onSubmit={handleProfileSubmit}
              className="overflow-hidden rounded-2xl border border-[#ebe6f2] bg-white shadow-[0_16px_45px_rgba(48,31,77,0.07)]"
            >
              <div className="flex items-center gap-3 border-b border-[#eee9f4] px-6 py-5">
                <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#211633]">
                    Dados pessoais
                  </h2>

                  <p className="mt-1 text-sm text-[#81798d]">
                    Informações usadas para identificar sua conta.
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label
                    htmlFor="name"
                    className="text-sm font-semibold text-[#393044]"
                  >
                    Nome
                  </label>

                  <div className="relative mt-2">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8497]" />

                    <input
                      id="name"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      minLength={2}
                      maxLength={120}
                      required
                      className="h-12 w-full rounded-xl border border-[#ded7e7] bg-[#fbfaff] pl-10 pr-4 text-sm text-[#211633] outline-none transition placeholder:text-[#96909f] focus:border-[#8a3ffc] focus:ring-2 focus:ring-[#8a3ffc]/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-[#393044]"
                  >
                    E-mail
                  </label>

                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8497]" />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      required
                      className="h-12 w-full rounded-xl border border-[#ded7e7] bg-[#fbfaff] pl-10 pr-4 text-sm text-[#211633] outline-none transition placeholder:text-[#96909f] focus:border-[#8a3ffc] focus:ring-2 focus:ring-[#8a3ffc]/10"
                    />
                  </div>
                </div>

                {profileError && profile ? (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                ) : null}

                {profileSuccess ? (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7c2cff] px-5 text-sm font-bold text-white shadow-lg shadow-purple-200 transition hover:bg-[#6b20e8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {isSavingProfile
                    ? "Salvando..."
                    : "Salvar alterações"}
                </button>
              </div>
            </form>

            <form
              onSubmit={handlePasswordSubmit}
              className="overflow-hidden rounded-2xl border border-[#ebe6f2] bg-white shadow-[0_16px_45px_rgba(48,31,77,0.07)]"
            >
              <div className="flex items-center gap-3 border-b border-[#eee9f4] px-6 py-5">
                <div className="rounded-xl border border-[#dccdff] bg-[#f1eaff] p-3 text-[#7c2cff]">
                  <LockKeyhole className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#211633]">
                    Segurança
                  </h2>

                  <p className="mt-1 text-sm text-[#81798d]">
                    Atualize sua senha de acesso ao portal.
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <PasswordField
                  id="current-password"
                  label="Senha atual"
                  value={currentPassword}
                  show={showCurrentPassword}
                  onToggle={() =>
                    setShowCurrentPassword(
                      (current) => !current,
                    )
                  }
                  onChange={setCurrentPassword}
                />

                <PasswordField
                  id="new-password"
                  label="Nova senha"
                  value={newPassword}
                  show={showNewPassword}
                  onToggle={() =>
                    setShowNewPassword(
                      (current) => !current,
                    )
                  }
                  onChange={setNewPassword}
                />

                <PasswordField
                  id="confirm-password"
                  label="Confirmar nova senha"
                  value={confirmPassword}
                  show={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword(
                      (current) => !current,
                    )
                  }
                  onChange={setConfirmPassword}
                />

                {passwordError ? (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                ) : null}

                {passwordSuccess ? (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#211633] px-5 text-sm font-bold text-white transition hover:bg-[#36264e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingPassword ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="h-4 w-4" />
                  )}

                  {isSavingPassword
                    ? "Alterando..."
                    : "Alterar senha"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function PasswordField({
  id,
  label,
  value,
  show,
  onToggle,
  onChange,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[#393044]"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8497]" />

        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          minLength={8}
          maxLength={128}
          required
          autoComplete={
            id === "current-password"
              ? "current-password"
              : "new-password"
          }
          className="h-12 w-full rounded-xl border border-[#ded7e7] bg-[#fbfaff] pl-10 pr-12 text-sm text-[#211633] outline-none transition placeholder:text-[#96909f] focus:border-[#8a3ffc] focus:ring-2 focus:ring-[#8a3ffc]/10"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            show ? "Ocultar senha" : "Mostrar senha"
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#81798d] transition hover:bg-[#f1eaff] hover:text-[#7c2cff]"
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
