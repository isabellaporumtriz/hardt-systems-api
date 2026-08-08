"use client";

import axios from "axios";
import {
  Ban,
  Check,
  CircleSlash2,
  Clock3,
  Copy,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createLicense,
  getLicenses,
  renewLicense,
  restoreLicense,
  revokeLicense,
  suspendLicense,
} from "@/lib/api/licenses";

import type {
  AdminLicense,
  LicenseCreateResponse,
} from "@/lib/api/licenses";

import { getProducts } from "@/lib/api/products";
import { getUsers } from "@/lib/api/users";

import type { Product } from "@/lib/types/api";
import type { User } from "@/lib/api/users";

type LicenseFormData = {
  user_id: string;
  product_id: string;
  duration_days: string;
  max_devices: string;
};

const emptyForm: LicenseFormData = {
  user_id: "",
  product_id: "",
  duration_days: "30",
  max_devices: "1",
};

const statusLabels: Record<string, string> = {
  pending_activation: "Aguardando ativação",
  active: "Ativa",
  expired: "Expirada",
  suspended: "Suspensa",
  revoked: "Revogada",
};

const statusClasses: Record<string, string> = {
  pending_activation:
    "bg-amber-500/15 text-amber-400",
  active:
    "bg-emerald-500/15 text-emerald-400",
  expired:
    "bg-zinc-500/15 text-zinc-400",
  suspended:
    "bg-orange-500/15 text-orange-400",
  revoked:
    "bg-red-500/15 text-red-400",
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<
    AdminLicense[]
  >([]);

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<
    Product[]
  >([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [actionLicenseId, setActionLicenseId] =
    useState<string | null>(null);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [isKeyModalOpen, setIsKeyModalOpen] =
    useState(false);

  const [isRenewModalOpen, setIsRenewModalOpen] =
    useState(false);

  const [createdLicense, setCreatedLicense] =
    useState<LicenseCreateResponse | null>(null);

  const [selectedLicense, setSelectedLicense] =
    useState<AdminLicense | null>(null);

  const [renewDays, setRenewDays] = useState("30");

  const [copiedKey, setCopiedKey] = useState(false);

  const [form, setForm] =
    useState<LicenseFormData>(emptyForm);

  const filteredLicenses = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return licenses.filter((license) => {
      const matchesSearch =
        !normalizedSearch ||
        license.license_number
          .toLowerCase()
          .includes(normalizedSearch) ||
        license.key_preview
          .toLowerCase()
          .includes(normalizedSearch) ||
        license.user_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        license.user_email
          .toLowerCase()
          .includes(normalizedSearch) ||
        license.product_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        license.product_slug
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        !statusFilter ||
        license.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [licenses, search, statusFilter]);

  async function loadPageData() {
    try {
      setPageError("");
      setIsLoading(true);

      const [
        licensesResult,
        usersResult,
        productsResult,
      ] = await Promise.all([
        getLicenses(),
        getUsers(),
        getProducts(),
      ]);

      setLicenses(licensesResult);
      setUsers(usersResult);
      setProducts(productsResult);
    } catch {
      setPageError(
        "Não foi possível carregar os dados de licenças."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function updateForm<K extends keyof LicenseFormData>(
    field: K,
    value: LicenseFormData[K]
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
    setCreatedLicense(null);
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (isSaving) {
      return;
    }

    setIsCreateModalOpen(false);
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
  }

  function closeKeyModal() {
    setIsKeyModalOpen(false);
    setCreatedLicense(null);
    setCopiedKey(false);
  }

  function openRenewModal(license: AdminLicense) {
    setSelectedLicense(license);
    setRenewDays("30");
    setFormError("");
    setSuccessMessage("");
    setIsRenewModalOpen(true);
  }

  function closeRenewModal() {
    if (isSaving) {
      return;
    }

    setSelectedLicense(null);
    setRenewDays("30");
    setFormError("");
    setSuccessMessage("");
    setIsRenewModalOpen(false);
  }

  function updateLicenseInList(
    id: string,
    status: string,
    expiresAt?: string | null
  ) {
    setLicenses((current) =>
      current.map((license) =>
        license.id === id
          ? {
              ...license,
              status,
              is_active:
                status === "active" ||
                status === "pending_activation",
              expires_at:
                expiresAt !== undefined
                  ? expiresAt
                  : license.expires_at,
            }
          : license
      )
    );
  }

  async function handleCreateLicense(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");
    setIsSaving(true);

    const durationDays = Number(form.duration_days);
    const maxDevices = Number(form.max_devices);

    if (!form.user_id) {
      setFormError("Selecione um usuário.");
      setIsSaving(false);
      return;
    }

    if (!form.product_id) {
      setFormError("Selecione um produto.");
      setIsSaving(false);
      return;
    }

    if (
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      durationDays > 3650
    ) {
      setFormError(
        "A duração deve ser entre 1 e 3650 dias."
      );
      setIsSaving(false);
      return;
    }

    if (
      !Number.isInteger(maxDevices) ||
      maxDevices < 1 ||
      maxDevices > 100
    ) {
      setFormError(
        "O limite deve ser entre 1 e 100 dispositivos."
      );
      setIsSaving(false);
      return;
    }

    try {
      const result = await createLicense({
        user_id: form.user_id,
        product_id: form.product_id,
        duration_days: durationDays,
        max_devices: maxDevices,
      });

      setCreatedLicense(result);
      setSuccessMessage(
        "Licença emitida com sucesso."
      );

      const selectedUser = users.find(
        (user) => user.id === form.user_id
      );

      const selectedProduct = products.find(
        (product) => product.id === form.product_id
      );

      const newLicense: AdminLicense = {
        id: result.id,
        license_number: result.license_number,
        key_preview: result.key_preview,

        user_id: form.user_id,
        user_name:
          selectedUser?.name ?? "Usuário",
        user_email:
          selectedUser?.email ?? "",

        product_id: form.product_id,
        product_name:
          selectedProduct?.name ?? "Produto",
        product_slug:
          selectedProduct?.slug ?? "",

        status: result.status,

        duration_days: result.duration_days,
        max_devices: result.max_devices,
        active_devices: 0,

        issued_at: result.issued_at,
        first_activated_at:
          result.first_activated_at,
        expires_at: result.expires_at,

        is_active: result.is_active,
      };

      setLicenses((current) => [
        newLicense,
        ...current,
      ]);

      setIsCreateModalOpen(false);
      setIsKeyModalOpen(true);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const detail =
          requestError.response?.data?.detail;

        if (typeof detail === "string") {
          setFormError(detail);
        } else {
          setFormError(
            "Não foi possível emitir a licença."
          );
        }
      } else {
        setFormError(
          "Não foi possível emitir a licença."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuspend(
    license: AdminLicense
  ) {
    const confirmed = window.confirm(
      `Deseja suspender a licença ${license.license_number}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPageError("");
      setActionLicenseId(license.id);

      const result = await suspendLicense(
        license.id
      );

      updateLicenseInList(
        license.id,
        result.status,
        result.expires_at
      );
    } catch (requestError) {
      handleActionError(
        requestError,
        "Não foi possível suspender a licença."
      );
    } finally {
      setActionLicenseId(null);
    }
  }

  async function handleRestore(
    license: AdminLicense
  ) {
    try {
      setPageError("");
      setActionLicenseId(license.id);

      const result = await restoreLicense(
        license.id
      );

      updateLicenseInList(
        license.id,
        result.status,
        result.expires_at
      );
    } catch (requestError) {
      handleActionError(
        requestError,
        "Não foi possível restaurar a licença."
      );
    } finally {
      setActionLicenseId(null);
    }
  }

  async function handleRevoke(
    license: AdminLicense
  ) {
    const confirmed = window.confirm(
      `Deseja revogar permanentemente a licença ${license.license_number}? Essa ação não poderá ser desfeita.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPageError("");
      setActionLicenseId(license.id);

      const result = await revokeLicense(
        license.id
      );

      updateLicenseInList(
        license.id,
        result.status,
        result.expires_at
      );
    } catch (requestError) {
      handleActionError(
        requestError,
        "Não foi possível revogar a licença."
      );
    } finally {
      setActionLicenseId(null);
    }
  }

  async function handleRenew(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedLicense) {
      return;
    }

    setFormError("");
    setSuccessMessage("");
    setIsSaving(true);

    const additionalDays = Number(renewDays);

    if (
      !Number.isInteger(additionalDays) ||
      additionalDays < 1
    ) {
      setFormError(
        "Informe uma quantidade válida de dias."
      );
      setIsSaving(false);
      return;
    }

    try {
      const result = await renewLicense(
        selectedLicense.id,
        additionalDays
      );

      updateLicenseInList(
        selectedLicense.id,
        result.status,
        result.expires_at
      );

      setSuccessMessage(result.message);

      window.setTimeout(() => {
        closeRenewModal();
      }, 700);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const detail =
          requestError.response?.data?.detail;

        if (typeof detail === "string") {
          setFormError(detail);
        } else {
          setFormError(
            "Não foi possível renovar a licença."
          );
        }
      } else {
        setFormError(
          "Não foi possível renovar a licença."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleActionError(
    requestError: unknown,
    fallbackMessage: string
  ) {
    if (axios.isAxiosError(requestError)) {
      const detail =
        requestError.response?.data?.detail;

      if (typeof detail === "string") {
        setPageError(detail);
        return;
      }
    }

    setPageError(fallbackMessage);
  }

  async function copyLicenseKey() {
    if (!createdLicense) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createdLicense.license_key
      );

      setCopiedKey(true);

      window.setTimeout(() => {
        setCopiedKey(false);
      }, 1800);
    } catch {
      setFormError(
        "Não foi possível copiar a chave."
      );
    }
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleString(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
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
              Licenças
            </h1>

            <p className="mt-1 text-zinc-500">
              Emita, suspenda, renove e gerencie as
              licenças dos clientes.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-semibold text-white transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Nova Licença
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row">
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
                placeholder="Buscar por licença, cliente ou produto..."
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-zinc-300 outline-none transition focus:border-violet-500"
            >
              <option value="">
                Todos os status
              </option>

              <option value="pending_activation">
                Aguardando ativação
              </option>

              <option value="active">
                Ativas
              </option>

              <option value="expired">
                Expiradas
              </option>

              <option value="suspended">
                Suspensas
              </option>

              <option value="revoked">
                Revogadas
              </option>
            </select>
          </div>

          <p className="shrink-0 text-sm text-zinc-500">
            {filteredLicenses.length}{" "}
            {filteredLicenses.length === 1
              ? "licença encontrada"
              : "licenças encontradas"}
          </p>
        </div>

        {pageError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {pageError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr className="text-left text-sm text-zinc-400">
                  <th className="px-6 py-4">
                    Licença
                  </th>

                  <th className="px-6 py-4">
                    Cliente
                  </th>

                  <th className="px-6 py-4">
                    Produto
                  </th>

                  <th className="px-6 py-4">
                    Dispositivos
                  </th>

                  <th className="px-6 py-4">
                    Expiração
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredLicenses.map((license) => {
                  const isProcessing =
                    actionLicenseId === license.id;

                  return (
                    <tr
                      key={license.id}
                      className="border-b border-zinc-800 transition last:border-0 hover:bg-zinc-800/30"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
                            <KeyRound size={20} />
                          </div>

                          <div>
                            <p className="font-medium text-white">
                              {license.license_number}
                            </p>

                            <p className="mt-1 font-mono text-xs text-zinc-500">
                              {license.key_preview}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <UserRound
                            size={17}
                            className="text-zinc-600"
                          />

                          <div>
                            <p className="text-sm font-medium text-zinc-200">
                              {license.user_name}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {license.user_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-zinc-300">
                          {license.product_name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {license.product_slug}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-zinc-300">
                        {license.active_devices} /{" "}
                        {license.max_devices}
                      </td>

                      <td className="px-6 py-5 text-sm text-zinc-400">
                        {formatDate(
                          license.expires_at
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            statusClasses[
                              license.status
                            ] ??
                            "bg-zinc-500/15 text-zinc-400"
                          }`}
                        >
                          {statusLabels[
                            license.status
                          ] ?? license.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          {isProcessing ? (
                            <div className="flex h-10 w-10 items-center justify-center">
                              <LoaderCircle
                                size={18}
                                className="animate-spin text-violet-400"
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openRenewModal(
                                    license
                                  )
                                }
                                disabled={
                                  license.status ===
                                  "revoked"
                                }
                                title="Renovar licença"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-violet-500/40 hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <RefreshCw
                                  size={16}
                                />
                              </button>

                              {license.status ===
                              "suspended" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRestore(
                                      license
                                    )
                                  }
                                  title="Restaurar licença"
                                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-emerald-500/40 hover:text-emerald-400"
                                >
                                  <RotateCcw
                                    size={16}
                                  />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSuspend(
                                      license
                                    )
                                  }
                                  disabled={
                                    license.status ===
                                      "revoked" ||
                                    license.status ===
                                      "expired"
                                  }
                                  title="Suspender licença"
                                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-orange-500/40 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <Ban size={16} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleRevoke(
                                    license
                                  )
                                }
                                disabled={
                                  license.status ===
                                  "revoked"
                                }
                                title="Revogar licença"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <CircleSlash2
                                  size={16}
                                />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLicenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center"
                    >
                      <KeyRound
                        size={32}
                        className="mx-auto text-zinc-700"
                      />

                      <p className="mt-4 font-medium text-zinc-300">
                        Nenhuma licença encontrada
                      </p>

                      <p className="mt-1 text-sm text-zinc-600">
                        Ajuste os filtros ou emita uma
                        nova licença.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-7 py-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Nova licença
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Emita uma licença para um cliente e
                  produto.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateLicense}
              className="space-y-5 p-7"
            >
              <div>
                <label
                  htmlFor="license-user"
                  className="text-sm font-medium text-zinc-300"
                >
                  Cliente
                </label>

                <select
                  id="license-user"
                  required
                  value={form.user_id}
                  onChange={(event) =>
                    updateForm(
                      "user_id",
                      event.target.value
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-violet-500"
                >
                  <option value="">
                    Selecione um cliente
                  </option>

                  {users.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.name} — {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="license-product"
                  className="text-sm font-medium text-zinc-300"
                >
                  Produto
                </label>

                <select
                  id="license-product"
                  required
                  value={form.product_id}
                  onChange={(event) =>
                    updateForm(
                      "product_id",
                      event.target.value
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-violet-500"
                >
                  <option value="">
                    Selecione um produto
                  </option>

                  {products
                    .filter(
                      (product) =>
                        product.is_active
                    )
                    .map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} — v
                        {product.version}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="license-duration"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Duração em dias
                  </label>

                  <input
                    id="license-duration"
                    required
                    type="number"
                    min="1"
                    max="3650"
                    step="1"
                    value={form.duration_days}
                    onChange={(event) =>
                      updateForm(
                        "duration_days",
                        event.target.value
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-violet-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="license-devices"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Limite de dispositivos
                  </label>

                  <input
                    id="license-devices"
                    required
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={form.max_devices}
                    onChange={(event) =>
                      updateForm(
                        "max_devices",
                        event.target.value
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex gap-3">
                  <Clock3
                    size={19}
                    className="mt-0.5 shrink-0 text-violet-400"
                  />

                  <div>
                    <p className="text-sm font-medium text-violet-200">
                      A validade começa na ativação
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      A contagem dos dias somente começa
                      quando o cliente ativar a licença
                      pela primeira vez.
                    </p>
                  </div>
                </div>
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
                  onClick={closeCreateModal}
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
                      Emitindo...
                    </>
                  ) : (
                    <>
                      <KeyRound size={17} />
                      Emitir licença
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isKeyModalOpen && createdLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-7 py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Licença emitida
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Salve a chave antes de fechar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeKeyModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-7">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
                Esta é a única vez que a chave completa
                será exibida. Copie e envie ao cliente
                antes de fechar esta janela.
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Número da licença
                </p>

                <p className="mt-2 font-semibold text-white">
                  {createdLicense.license_number}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Chave completa
                </p>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <code className="min-w-0 flex-1 break-all text-sm font-semibold text-violet-300">
                    {createdLicense.license_key}
                  </code>

                  <button
                    type="button"
                    onClick={copyLicenseKey}
                    className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500"
                  >
                    {copiedKey ? (
                      <>
                        <Check size={17} />
                        Copiada
                      </>
                    ) : (
                      <>
                        <Copy size={17} />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <button
                type="button"
                onClick={closeKeyModal}
                className="h-12 w-full rounded-xl border border-zinc-800 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                Já salvei a chave
              </button>
            </div>
          </div>
        </div>
      )}

      {isRenewModalOpen && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-7 py-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Renovar licença
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {selectedLicense.license_number}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRenewModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleRenew}
              className="space-y-5 p-7"
            >
              <div>
                <label
                  htmlFor="renew-days"
                  className="text-sm font-medium text-zinc-300"
                >
                  Dias adicionais
                </label>

                <input
                  id="renew-days"
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={renewDays}
                  onChange={(event) =>
                    setRenewDays(
                      event.target.value
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-violet-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-sm text-zinc-500">
                  Expiração atual
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {formatDate(
                    selectedLicense.expires_at
                  )}
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
                  onClick={closeRenewModal}
                  disabled={isSaving}
                  className="h-11 rounded-xl border border-zinc-800 px-5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Renovando...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={17} />
                      Renovar
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