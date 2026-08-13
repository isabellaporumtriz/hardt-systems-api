"use client";

import Link from "next/link";

import axios from "axios";
import {
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  X,
  Boxes,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createProduct,
  getProducts,
  updateProduct,
} from "@/lib/api/products";

import type {
  Product,
  ProductCreate,
} from "@/lib/types/api";

type ProductFormData = {
  name: string;
  slug: string;
  description: string;
  version: string;
  price: string;
  is_active: boolean;
};

const emptyForm: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  version: "1.0.0",
  price: "0.00",
  is_active: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<ProductFormData>(emptyForm);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        product.slug
          .toLowerCase()
          .includes(normalizedSearch) ||
        product.version
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [products, search]);

  async function loadProducts() {
    try {
      setPageError("");

      const result = await getProducts();

      setProducts(result);
    } catch {
      setPageError(
        "Não foi possível carregar os produtos."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function generateSlug(name: string) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function openCreateModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);

    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      version: product.version,
      price: String(product.price),
      is_active: product.is_active,
    });

    setFormError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
  }

  function updateForm<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleNameChange(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug:
        editingProduct || current.slug
          ? current.slug
          : generateSlug(name),
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");
    setIsSaving(true);

    const normalizedPrice = Number(
      form.price.replace(",", ".")
    );

    if (Number.isNaN(normalizedPrice)) {
      setFormError("Informe um preço válido.");
      setIsSaving(false);
      return;
    }

    const payload: ProductCreate = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description:
        form.description.trim() || undefined,
      version: form.version.trim(),
      price: normalizedPrice,
      is_active: form.is_active,
    };

    try {
      if (editingProduct) {
        const updatedProduct = await updateProduct(
          editingProduct.id,
          payload
        );

        setProducts((current) =>
          current.map((product) =>
            product.id === updatedProduct.id
              ? updatedProduct
              : product
          )
        );

        setSuccessMessage(
          "Produto atualizado com sucesso."
        );
      } else {
        const createdProduct =
          await createProduct(payload);

        setProducts((current) => [
          createdProduct,
          ...current,
        ]);

        setSuccessMessage(
          "Produto criado com sucesso."
        );
      }

      window.setTimeout(() => {
        closeModal();
      }, 700);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const detail =
          requestError.response?.data?.detail;

        if (typeof detail === "string") {
          setFormError(detail);
        } else {
          setFormError(
            "Não foi possível salvar o produto."
          );
        }
      } else {
        setFormError(
          "Não foi possível salvar o produto."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProductStatus(
    product: Product
  ) {
    try {
      setPageError("");

      const updatedProduct = await updateProduct(
        product.id,
        {
          is_active: !product.is_active,
        }
      );

      setProducts((current) =>
        current.map((item) =>
          item.id === updatedProduct.id
            ? updatedProduct
            : item
        )
      );
    } catch {
      setPageError(
        "Não foi possível alterar o status do produto."
      );
    }
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
              Produtos
            </h1>

            <p className="mt-1 text-zinc-500">
              Gerencie todos os produtos da Hardt
              Systems.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-semibold text-white transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Novo Produto
          </button>
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
              placeholder="Pesquisar por nome, slug ou versão..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <p className="text-sm text-zinc-500">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1
              ? "produto encontrado"
              : "produtos encontrados"}
          </p>
        </div>

        {pageError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {pageError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr className="text-left text-sm text-zinc-400">
                  <th className="px-6 py-4">
                    Produto
                  </th>

                  <th className="px-6 py-4">
                    Versão
                  </th>

                  <th className="px-6 py-4">
                    Preço
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
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-zinc-800 transition last:border-0 hover:bg-zinc-800/30"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
                          <Package size={20} />
                        </div>

                        <div>
                          <p className="font-medium text-white">
                            {product.name}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-zinc-300">
                      v{product.version}
                    </td>

                    <td className="px-6 py-5 text-zinc-300">
                      {Number(
                        product.price
                      ).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>

                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() =>
                          toggleProductStatus(product)
                        }
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition ${
                          product.is_active
                            ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                            : "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        }`}
                      >
                        {product.is_active
                          ? "Ativo"
                          : "Inativo"}
                      </button>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/products/${product.id}/inventory`}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 text-sm font-medium text-violet-300 transition hover:border-violet-500/40 hover:bg-violet-500/15 hover:text-white"
                        >
                          <Boxes size={15} />
                          Estoque
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(product)
                          }
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-violet-500/40 hover:text-white"
                        >
                          <Pencil size={15} />
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center"
                    >
                      <Package
                        size={32}
                        className="mx-auto text-zinc-700"
                      />

                      <p className="mt-4 font-medium text-zinc-300">
                        Nenhum produto encontrado
                      </p>

                      <p className="mt-1 text-sm text-zinc-600">
                        Ajuste a pesquisa ou crie um novo
                        produto.
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
                  {editingProduct
                    ? "Editar produto"
                    : "Novo produto"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {editingProduct
                    ? "Atualize os dados do produto."
                    : "Cadastre um novo produto na Hardt Systems."}
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
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="product-name"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Nome
                  </label>

                  <input
                    id="product-name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.name}
                    onChange={(event) =>
                      handleNameChange(
                        event.target.value
                      )
                    }
                    placeholder="Google Meet Robot"
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-slug"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Slug
                  </label>

                  <input
                    id="product-slug"
                    required
                    minLength={2}
                    maxLength={120}
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    value={form.slug}
                    onChange={(event) =>
                      updateForm(
                        "slug",
                        event.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                      )
                    }
                    placeholder="google-meet-robot"
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="product-description"
                  className="text-sm font-medium text-zinc-300"
                >
                  Descrição
                </label>

                <textarea
                  id="product-description"
                  rows={4}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Descreva o produto..."
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="product-version"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Versão
                  </label>

                  <input
                    id="product-version"
                    required
                    maxLength={30}
                    value={form.version}
                    onChange={(event) =>
                      updateForm(
                        "version",
                        event.target.value
                      )
                    }
                    placeholder="1.0.0"
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-price"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Preço
                  </label>

                  <input
                    id="product-price"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      updateForm(
                        "price",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div>
                  <p className="text-sm font-medium text-white">
                    Produto ativo
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Produtos inativos não devem ser
                    comercializados.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateForm(
                      "is_active",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 accent-violet-600"
                />
              </label>

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
                  className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Salvando...
                    </>
                  ) : editingProduct ? (
                    "Salvar alterações"
                  ) : (
                    "Criar produto"
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