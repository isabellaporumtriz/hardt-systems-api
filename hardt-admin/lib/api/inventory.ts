import { api } from "@/lib/api/client";


export type InventoryStock = {
  product_id: string;
  product_name: string;
  available: number;
  sold: number;
  total: number;
};


export type InventoryBulkCreateResponse = {
  product_id: string;
  created: number;
  available_stock: number;
};


export async function getProductStock(
  productId: string
): Promise<InventoryStock> {
  const response = await api.get<InventoryStock>(
    `/store/admin/products/${productId}/stock`
  );

  return response.data;
}


export async function addInventoryItem(
  productId: string,
  deliveryPayload: Record<string, unknown>
): Promise<InventoryBulkCreateResponse> {
  const response =
    await api.post<InventoryBulkCreateResponse>(
      `/store/admin/products/${productId}/inventory`,
      {
        items: [
          {
            payload: deliveryPayload,
          },
        ],
      }
    );

  return response.data;
}
