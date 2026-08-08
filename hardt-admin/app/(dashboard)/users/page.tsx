"use client";

import axios from "axios";
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createUser,
  getUsers,
} from "@/lib/api/users";

import type {
  User,
  UserCreate,
} from "@/lib/api/users";

type UserFormData = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

const emptyForm: UserFormData = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);

  const [form, setForm] =
    useState<UserFormData>(emptyForm);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.email
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [users, search]);

  const totalActiveUsers = useMemo(() => {
    return users.filter((user) => user.is_active)
      .length;
  }, [users]);

  const totalAdmins = useMemo(() => {
    return users.filter((user) => user.is_admin)
      .length;
  }, [users]);

  async function loadUsers() {
    try {
      setPageError("");
      setIsLoading(true);

      const result = await getUsers();

      setUsers(result);
    } catch {
      setPageError(
        "Não foi possível carregar os usuários."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateForm<K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateModal() {
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
    setShowPassword(false);
    setShowPasswordConfirmation(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");
    setIsSaving(true);

    if (form.name.trim().length < 2) {
      setFormError(
        "O nome deve ter pelo menos 2 caracteres."
      );
      setIsSaving(false);
      return;
    }

    if (form.password.length < 8) {
      setFormError(
        "A senha deve ter pelo menos 8 caracteres."
      );
      setIsSaving(false);
      return;
    }

    if (
      form.password !==
      form.password_confirmation
    ) {
      setFormError(
        "A confirmação de senha não corresponde."
      );
      setIsSaving(false);
      return;
    }

    const payload: UserCreate = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    try {
      const createdUser = await createUser(
        payload
      );

      setUsers((current) => [
        createdUser,
        ...current,
      ]);

      setSuccessMessage(
        "Usuário criado com sucesso."
      );

      window.setTimeout(() => {
        closeModal();
      }, 700);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const detail =
          requestError.response?.data?.detail;

        if (typeof detail === "string") {
          setFormError(detail);
        } else if (Array.isArray(detail)) {
          const firstMessage =
            detail[0]?.msg;

          setFormError(
            typeof firstMessage === "string"
              ? firstMessage
              : "Não foi possível criar o usuário."
          );
        } else {
          setFormError(
            "Não foi possível criar o usuário."
          );
        }
      } else {
        setFormError(
          "Não foi possível criar o usuário."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Usuários
            </h1>

            <p className="mt-1 text-zinc-500">
              Cadastre e acompanhe os usuários da
              Hardt Systems.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-semibold text-white transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Novo Usuário
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Total de usuários
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {users.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
                <UsersRound size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Usuários ativos
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {totalActiveUsers}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Administradores
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {totalAdmins}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <ShieldCheck size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pesquisar por nome ou e-mail..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <p className="text-sm text-zinc-500">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1
              ? "usuário encontrado"
              : "usuários encontrados"}
          </p>
        </div>

        {pageError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {pageError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr className="text-left text-sm text-zinc-400">
                  <th className="px-6 py-4">
                    Usuário
                  </th>

                  <th className="px-6 py-4">
                    E-mail
                  </th>

                  <th className="px-6 py-4">
                    Perfil
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Cadastro
                  </th>

                  <th className="px-6 py-4">
                    Atualização
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-800 transition last:border-0 hover:bg-zinc-800/30"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-sm font-bold text-violet-300">
                          {getInitials(user.name)}
                        </div>

                        <div>
                          <p className="font-medium text-white">
                            {user.name}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            ID: {user.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Mail
                          size={16}
                          className="text-zinc-600"
                        />

                        {user.email}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          user.is_admin
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-violet-500/15 text-violet-400"
                        }`}
                      >
                        {user.is_admin ? (
                          <ShieldCheck size={13} />
                        ) : (
                          <UserRound size={13} />
                        )}

                        {user.is_admin
                          ? "Administrador"
                          : "Cliente"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.is_active
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {user.is_active
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <CalendarDays
                          size={15}
                          className="text-zinc-600"
                        />

                        {formatDate(
                          user.created_at
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm text-zinc-400">
                      {formatDate(
                        user.updated_at
                      )}
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center"
                    >
                      <UsersRound
                        size={32}
                        className="mx-auto text-zinc-700"
                      />

                      <p className="mt-4 font-medium text-zinc-300">
                        Nenhum usuário encontrado
                      </p>

                      <p className="mt-1 text-sm text-zinc-600">
                        Ajuste a pesquisa ou cadastre um
                        novo usuário.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-7 py-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Novo usuário
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Cadastre um novo cliente na Hardt
                  Systems.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-7"
            >
              <div>
                <label
                  htmlFor="user-name"
                  className="text-sm font-medium text-zinc-300"
                >
                  Nome completo
                </label>

                <input
                  id="user-name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="Nome do cliente"
                  autoComplete="name"
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                />
              </div>

              <div>
                <label
                  htmlFor="user-email"
                  className="text-sm font-medium text-zinc-300"
                >
                  E-mail
                </label>

                <input
                  id="user-email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm(
                      "email",
                      event.target.value
                    )
                  }
                  placeholder="cliente@email.com"
                  autoComplete="email"
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-password"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Senha
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="user-password"
                      required
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      minLength={8}
                      maxLength={128}
                      value={form.password}
                      onChange={(event) =>
                        updateForm(
                          "password",
                          event.target.value
                        )
                      }
                      placeholder="Mínimo de 8 caracteres"
                      autoComplete="new-password"
                      className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="user-password-confirmation"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Confirmar senha
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="user-password-confirmation"
                      required
                      type={
                        showPasswordConfirmation
                          ? "text"
                          : "password"
                      }
                      minLength={8}
                      maxLength={128}
                      value={
                        form.password_confirmation
                      }
                      onChange={(event) =>
                        updateForm(
                          "password_confirmation",
                          event.target.value
                        )
                      }
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordConfirmation(
                          (current) => !current
                        )
                      }
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                    >
                      {showPasswordConfirmation ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="text-sm font-medium text-violet-200">
                  Acesso inicial do cliente
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  O usuário será criado como cliente
                  ativo. Envie o e-mail e a senha
                  cadastrados para que ele consiga
                  acessar o sistema.
                </p>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {successMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="h-11 rounded-xl border border-zinc-800 px-5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserRound size={17} />
                      Criar usuário
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}