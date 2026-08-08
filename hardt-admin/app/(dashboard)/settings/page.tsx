"use client";

import {
  Activity,
  AlertCircle,
  AppWindow,
  CheckCircle2,
  Clock3,
  Code2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type AdminSettings,
  getAdminSettings,
  updateAdminPassword,
  updateAdminProfile,
} from "@/lib/api/settings";


type ProfileFormData = {
  name: string;
  email: string;
};


type PasswordFormData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};


const emptyProfileForm: ProfileFormData = {
  name: "",
  email: "",
};


const emptyPasswordForm: PasswordFormData = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};


function formatDate(value: string | null): string {
  if (!value) {
    return "Não informado";
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


function getEnvironmentLabel(
  environment: string,
): string {
  const normalizedEnvironment =
    environment.trim().toLowerCase();

  if (
    normalizedEnvironment === "development"
    || normalizedEnvironment === "dev"
  ) {
    return "Desenvolvimento";
  }

  if (
    normalizedEnvironment === "production"
    || normalizedEnvironment === "prod"
  ) {
    return "Produção";
  }

  if (
    normalizedEnvironment === "staging"
    || normalizedEnvironment === "stage"
  ) {
    return "Homologação";
  }

  return environment || "Não informado";
}


function getInitials(name: string): string {
  const normalizedName = name.trim();

  if (!normalizedName) {
    return "AD";
  }

  const parts = normalizedName
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`
    .toUpperCase();
}


export default function SettingsPage() {
  const [settingsData, setSettingsData] =
    useState<AdminSettings | null>(null);

  const [profileForm, setProfileForm] =
    useState<ProfileFormData>(
      emptyProfileForm,
    );

  const [passwordForm, setPasswordForm] =
    useState<PasswordFormData>(
      emptyPasswordForm,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [isSavingPassword, setIsSavingPassword] =
    useState(false);

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);


  const loadSettings = useCallback(
    async (showRefresh = false) => {
      try {
        setError(null);

        if (showRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response =
          await getAdminSettings();

        setSettingsData(response);

        setProfileForm({
          name: response.name,
          email: response.email,
        });
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar as configurações.";

        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );


  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);


  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);


  const profileChanged = useMemo(() => {
    if (!settingsData) {
      return false;
    }

    return (
      profileForm.name.trim()
        !== settingsData.name.trim()
      || profileForm.email.trim().toLowerCase()
        !== settingsData.email
          .trim()
          .toLowerCase()
    );
  }, [
    profileForm.email,
    profileForm.name,
    settingsData,
  ]);


  const passwordStrength = useMemo(() => {
    const password =
      passwordForm.new_password;

    if (!password) {
      return {
        label: "Não informada",
        level: 0,
      };
    }

    let score = 0;

    if (password.length >= 8) {
      score += 1;
    }

    if (password.length >= 12) {
      score += 1;
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }

    if (score <= 2) {
      return {
        label: "Fraca",
        level: 1,
      };
    }

    if (score <= 4) {
      return {
        label: "Média",
        level: 2,
      };
    }

    return {
      label: "Forte",
      level: 3,
    };
  }, [passwordForm.new_password]);


  function updateProfileForm<
    K extends keyof ProfileFormData,
  >(
    field: K,
    value: ProfileFormData[K],
  ) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  function updatePasswordForm<
    K extends keyof PasswordFormData,
  >(
    field: K,
    value: PasswordFormData[K],
  ) {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedName =
      profileForm.name.trim();

    const normalizedEmail =
      profileForm.email.trim().toLowerCase();

    setError(null);
    setSuccessMessage(null);

    if (normalizedName.length < 2) {
      setError(
        "O nome deve possuir pelo menos 2 caracteres.",
      );
      return;
    }

    if (!normalizedEmail) {
      setError(
        "Informe um endereço de e-mail.",
      );
      return;
    }

    if (!profileChanged) {
      setError(
        "Nenhuma alteração foi feita no perfil.",
      );
      return;
    }

    try {
      setIsSavingProfile(true);

      const response =
        await updateAdminProfile({
          name: normalizedName,
          email: normalizedEmail,
        });

      setSettingsData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          name: response.name,
          email: response.email,
          updated_at: response.updated_at,
        };
      });

      setProfileForm({
        name: response.name,
        email: response.email,
      });

      setSuccessMessage(
        response.message
        || "Perfil atualizado com sucesso.",
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível atualizar o perfil.";

      setError(message);
    } finally {
      setIsSavingProfile(false);
    }
  }


  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (
      !passwordForm.current_password
      || !passwordForm.new_password
      || !passwordForm.confirm_password
    ) {
      setError(
        "Preencha todos os campos de senha.",
      );
      return;
    }

    if (
      passwordForm.current_password.length < 8
    ) {
      setError(
        "A senha atual deve possuir pelo menos 8 caracteres.",
      );
      return;
    }

    if (
      passwordForm.new_password.length < 8
    ) {
      setError(
        "A nova senha deve possuir pelo menos 8 caracteres.",
      );
      return;
    }

    if (
      passwordForm.new_password
      !== passwordForm.confirm_password
    ) {
      setError(
        "A confirmação da nova senha não corresponde.",
      );
      return;
    }

    if (
      passwordForm.current_password
      === passwordForm.new_password
    ) {
      setError(
        "A nova senha deve ser diferente da senha atual.",
      );
      return;
    }

    try {
      setIsSavingPassword(true);

      const response =
        await updateAdminPassword({
          current_password:
            passwordForm.current_password,
          new_password:
            passwordForm.new_password,
          confirm_password:
            passwordForm.confirm_password,
        });

      setPasswordForm(
        emptyPasswordForm,
      );

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setSuccessMessage(
        response.message
        || "Senha atualizada com sucesso.",
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível atualizar a senha.";

      setError(message);
    } finally {
      setIsSavingPassword(false);
    }
  }


  function resetProfileForm() {
    if (!settingsData) {
      return;
    }

    setProfileForm({
      name: settingsData.name,
      email: settingsData.email,
    });

    setError(null);
  }


  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
          <Loader2 className="size-7 animate-spin text-violet-400" />
        </div>

        <div className="text-center">
          <p className="font-medium text-zinc-200">
            Carregando configurações
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Buscando os dados da sua conta e da API.
          </p>
        </div>
      </div>
    );
  }


  if (!settingsData) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertCircle className="size-7 text-red-400" />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-white">
          Não foi possível abrir as configurações
        </h1>

        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          Os dados da conta não foram carregados.
          Verifique se a API está online e tente novamente.
        </p>

        {error && (
          <p className="mt-3 max-w-md text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void loadSettings()}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </button>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
              <Settings className="size-5 text-violet-400" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Administração
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Configurações
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Gerencie seus dados administrativos,
            atualize sua senha e consulte as informações
            da infraestrutura do Hardt Systems.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadSettings(true)
          }
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
            onClick={() =>
              setSuccessMessage(null)
            }
            className="rounded-lg p-1 text-emerald-300 transition hover:bg-emerald-500/10 hover:text-emerald-200"
            aria-label="Fechar mensagem de sucesso"
          >
            <X className="size-4" />
          </button>
        </div>
      )}


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          label="Administrador"
          value={settingsData.name}
          description={settingsData.email}
          icon={UserRound}
        />

        <OverviewCard
          label="API"
          value={
            settingsData.system.api_status
              .toLowerCase()
              === "online"
              ? "Online"
              : settingsData.system.api_status
          }
          description={
            settingsData.system.app_name
          }
          icon={Activity}
          status
        />

        <OverviewCard
          label="Versão"
          value={`v${settingsData.system.app_version}`}
          description="Versão atual da API"
          icon={Code2}
        />

        <OverviewCard
          label="Ambiente"
          value={getEnvironmentLabel(
            settingsData.system.environment,
          )}
          description={
            settingsData.system.debug
              ? "Modo debug ativado"
              : "Modo debug desativado"
          }
          icon={Server}
        />
      </section>


      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="space-y-6">
          <form
            onSubmit={handleProfileSubmit}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
          >
            <div className="flex flex-col gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                  <UserRound className="size-5 text-violet-400" />
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    Perfil administrativo
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Dados usados para identificar sua
                    conta no painel.
                  </p>
                </div>
              </div>

              <StatusBadge
                active={settingsData.is_active}
                activeLabel="Conta ativa"
                inactiveLabel="Conta inativa"
              />
            </div>


            <div className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="admin-name"
                  className="text-sm font-medium text-zinc-300"
                >
                  Nome
                </label>

                <div className="relative mt-2">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />

                  <input
                    id="admin-name"
                    type="text"
                    minLength={2}
                    maxLength={120}
                    required
                    value={profileForm.name}
                    onChange={(event) =>
                      updateProfileForm(
                        "name",
                        event.target.value,
                      )
                    }
                    autoComplete="name"
                    placeholder="Seu nome"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"
                  />
                </div>

                <p className="mt-2 text-xs text-zinc-600">
                  Entre 2 e 120 caracteres.
                </p>
              </div>


              <div>
                <label
                  htmlFor="admin-email"
                  className="text-sm font-medium text-zinc-300"
                >
                  E-mail
                </label>

                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />

                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(event) =>
                      updateProfileForm(
                        "email",
                        event.target.value,
                      )
                    }
                    autoComplete="email"
                    placeholder="email@empresa.com"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Este e-mail também é utilizado no seu
                  acesso administrativo.
                </p>
              </div>
            </div>


            <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-600">
                Última atualização:{" "}
                <span className="text-zinc-500">
                  {formatDate(
                    settingsData.updated_at,
                  )}
                </span>
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetProfileForm}
                  disabled={
                    isSavingProfile
                    || !profileChanged
                  }
                  className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Descartar
                </button>

                <button
                  type="submit"
                  disabled={
                    isSavingProfile
                    || !profileChanged
                  }
                  className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Salvar alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>


          <form
            onSubmit={handlePasswordSubmit}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
          >
            <div className="flex items-start gap-4 border-b border-white/10 p-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <LockKeyhole className="size-5 text-violet-400" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Segurança
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Altere sua senha administrativa
                  confirmando primeiro a senha atual.
                </p>
              </div>
            </div>


            <div className="space-y-5 p-6">
              <PasswordField
                id="current-password"
                label="Senha atual"
                value={
                  passwordForm.current_password
                }
                visible={showCurrentPassword}
                onVisibilityChange={() =>
                  setShowCurrentPassword(
                    (current) => !current,
                  )
                }
                onChange={(value) =>
                  updatePasswordForm(
                    "current_password",
                    value,
                  )
                }
                autoComplete="current-password"
                placeholder="Digite sua senha atual"
              />


              <div className="grid gap-5 lg:grid-cols-2">
                <PasswordField
                  id="new-password"
                  label="Nova senha"
                  value={
                    passwordForm.new_password
                  }
                  visible={showNewPassword}
                  onVisibilityChange={() =>
                    setShowNewPassword(
                      (current) => !current,
                    )
                  }
                  onChange={(value) =>
                    updatePasswordForm(
                      "new_password",
                      value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Crie uma nova senha"
                />

                <PasswordField
                  id="confirm-password"
                  label="Confirmar nova senha"
                  value={
                    passwordForm.confirm_password
                  }
                  visible={showConfirmPassword}
                  onVisibilityChange={() =>
                    setShowConfirmPassword(
                      (current) => !current,
                    )
                  }
                  onChange={(value) =>
                    updatePasswordForm(
                      "confirm_password",
                      value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                />
              </div>


              <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      Força da nova senha
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Use letras, números e símbolos.
                    </p>
                  </div>

                  <span
                    className={
                      passwordStrength.level === 3
                        ? "text-sm font-semibold text-emerald-400"
                        : passwordStrength.level === 2
                          ? "text-sm font-semibold text-amber-400"
                          : passwordStrength.level === 1
                            ? "text-sm font-semibold text-red-400"
                            : "text-sm font-medium text-zinc-600"
                    }
                  >
                    {passwordStrength.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={
                        passwordStrength.level
                          >= level
                          ? passwordStrength.level
                              === 3
                            ? "h-1.5 rounded-full bg-emerald-500"
                            : passwordStrength.level
                                === 2
                              ? "h-1.5 rounded-full bg-amber-500"
                              : "h-1.5 rounded-full bg-red-500"
                          : "h-1.5 rounded-full bg-white/[0.07]"
                      }
                    />
                  ))}
                </div>
              </div>


              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-violet-400" />

                  <div>
                    <p className="text-sm font-medium text-violet-200">
                      Requisitos de segurança
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      A senha deve possuir pelo menos
                      8 caracteres. Para maior segurança,
                      utilize uma combinação diferente das
                      suas senhas anteriores.
                    </p>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex justify-end border-t border-white/10 bg-black/10 p-5">
              <button
                type="submit"
                disabled={
                  isSavingPassword
                  || !passwordForm.current_password
                  || !passwordForm.new_password
                  || !passwordForm.confirm_password
                }
                className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    Alterar senha
                  </>
                )}
              </button>
            </div>
          </form>
        </div>


        <aside className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-lg font-bold text-white shadow-lg shadow-violet-950/40">
                  {getInitials(
                    settingsData.name,
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {settingsData.name}
                  </p>

                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {settingsData.email}
                  </p>
                </div>
              </div>
            </div>


            <div className="divide-y divide-white/[0.07]">
              <AccountInformationRow
                label="Tipo de conta"
                value={
                  settingsData.is_admin
                    ? "Administrador"
                    : "Usuário"
                }
                icon={ShieldCheck}
              />

              <AccountInformationRow
                label="Status"
                value={
                  settingsData.is_active
                    ? "Ativa"
                    : "Inativa"
                }
                icon={Activity}
                highlighted={
                  settingsData.is_active
                }
              />

              <AccountInformationRow
                label="Conta criada"
                value={formatDate(
                  settingsData.created_at,
                )}
                icon={Clock3}
              />
            </div>
          </section>


          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="flex items-start gap-4 border-b border-white/10 p-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <Server className="size-5 text-violet-400" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Informações do sistema
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Configurações atuais fornecidas pela API.
                </p>
              </div>
            </div>


            <div className="space-y-3 p-5">
              <SystemInformationItem
                label="Aplicação"
                value={
                  settingsData.system.app_name
                }
                icon={AppWindow}
              />

              <SystemInformationItem
                label="Versão"
                value={`v${settingsData.system.app_version}`}
                icon={Code2}
                mono
              />

              <SystemInformationItem
                label="Ambiente"
                value={getEnvironmentLabel(
                  settingsData.system.environment,
                )}
                icon={Server}
              />

              <SystemInformationItem
                label="Modo debug"
                value={
                  settingsData.system.debug
                    ? "Ativado"
                    : "Desativado"
                }
                icon={Code2}
              />

              <SystemInformationItem
                label="Expiração da sessão"
                value={`${settingsData.system.access_token_expire_minutes} minutos`}
                icon={Clock3}
              />

              <SystemInformationItem
                label="Status da API"
                value={
                  settingsData.system.api_status
                }
                icon={Activity}
                online={
                  settingsData.system.api_status
                    .toLowerCase()
                    === "online"
                }
              />
            </div>
          </section>


          <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-violet-500/[0.03] p-6">
            <div className="flex size-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
              <ShieldCheck className="size-5 text-violet-400" />
            </div>

            <h2 className="mt-5 font-semibold text-white">
              Hardt Systems
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Painel administrativo protegido por
              autenticação JWT e acesso restrito a
              administradores ativos.
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-violet-300">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              Infraestrutura operacional
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}


interface OverviewCardProps {
  label: string;
  value: string;
  description: string;
  icon: typeof Settings;
  status?: boolean;
}


function OverviewCard({
  label,
  value,
  description,
  icon: Icon,
  status = false,
}: OverviewCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-400">
            {label}
          </p>

          <div className="mt-3 flex min-w-0 items-center gap-2">
            {status && (
              <span className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.7)]" />
            )}

            <p className="truncate text-xl font-semibold tracking-tight text-white">
              {value}
            </p>
          </div>

          <p
            title={description}
            className="mt-2 truncate text-xs text-zinc-500"
          >
            {description}
          </p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
          <Icon className="size-5 text-violet-400" />
        </div>
      </div>
    </article>
  );
}


interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onVisibilityChange: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
}


function PasswordField({
  id,
  label,
  value,
  visible,
  onVisibilityChange,
  onChange,
  autoComplete,
  placeholder,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-300"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />

        <input
          id={id}
          type={visible ? "text" : "password"}
          minLength={8}
          maxLength={128}
          required
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"
        />

        <button
          type="button"
          onClick={onVisibilityChange}
          className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/[0.05] hover:text-zinc-300"
          aria-label={
            visible
              ? `Ocultar ${label.toLowerCase()}`
              : `Exibir ${label.toLowerCase()}`
          }
        >
          {visible ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}


function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  if (active) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        {activeLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300">
      <span className="size-1.5 rounded-full bg-red-400" />
      {inactiveLabel}
    </span>
  );
}


interface AccountInformationRowProps {
  label: string;
  value: string;
  icon: typeof UserRound;
  highlighted?: boolean;
}


function AccountInformationRow({
  label,
  value,
  icon: Icon,
  highlighted = false,
}: AccountInformationRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-zinc-600" />

        <span className="text-sm text-zinc-500">
          {label}
        </span>
      </div>

      <span
        className={
          highlighted
            ? "text-sm font-medium text-emerald-400"
            : "text-right text-sm font-medium text-zinc-300"
        }
      >
        {value}
      </span>
    </div>
  );
}


interface SystemInformationItemProps {
  label: string;
  value: string;
  icon: typeof Server;
  mono?: boolean;
  online?: boolean;
}


function SystemInformationItem({
  label,
  value,
  icon: Icon,
  mono = false,
  online = false,
}: SystemInformationItemProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
          <Icon className="size-4 text-zinc-500" />
        </div>

        <span className="text-sm text-zinc-500">
          {label}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {online && (
          <span className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.65)]" />
        )}

        <span
          title={value}
          className={
            mono
              ? "truncate font-mono text-xs font-medium text-zinc-300"
              : online
                ? "truncate text-sm font-medium text-emerald-400"
                : "truncate text-sm font-medium text-zinc-300"
          }
        >
          {value}
        </span>
      </div>
    </div>
  );
}