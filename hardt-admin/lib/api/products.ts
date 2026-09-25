import { api } from "@/lib/api/client";

import type {
  Product,
  ProductCreate,
  ProductUpdate,
} from "@/lib/types/api";

export async function getProducts(): Promise<Product[]> {
  const response = await api.get<Product[]>("/products");

  return response.data;
}

export async function getProduct(
  id: string
): Promise<Product> {
  const response = await api.get<Product>(
    `/products/${id}`
  );

  return response.data;
}

export async function createProduct(
  data: ProductCreate
): Promise<Product> {
  const response = await api.post<Product>(
    "/products",
    data
  );

  return response.data;
}

export async function updateProduct(
  id: string,
  data: ProductUpdate
): Promise<Product> {
  const response = await api.patch<Product>(
    `/products/${id}`,
    data
  );

  return response.data;
}