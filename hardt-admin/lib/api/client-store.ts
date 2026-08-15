import { api } from "@/lib/api/client";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  available_stock: number;
  delivery_type: "licensed" | "inventory" | "service";
};

export type StorePurchase = {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  inventory_item_id: string | null;
  delivery_type: "licensed" | "inventory" | "service";
  quantity: number;
  unit_price_brl: number;
  amount_brl: number;
  status: string;
  completed_at: string | null;
  created_at: string;
};

export type PurchaseDeliveryItem = {
  inventory_item_id?: string;
  payload: Record<string, unknown>;
};

export type PurchaseDelivery = {
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  items: PurchaseDeliveryItem[];
};

export async function getStoreProducts(): Promise<StoreProduct[]> {
  const response = await api.get<StoreProduct[]>("/store/products");

  return response.data;
}

export async function purchaseStoreProduct(
  productId: string,
  quantity: number,
  idempotencyKey: string,
): Promise<StorePurchase> {
  const response = await api.post<StorePurchase>("/store/purchases", {
    product_id: productId,
    quantity,
    idempotency_key: idempotencyKey,
  });

  return response.data;
}

export async function getStorePurchases(): Promise<StorePurchase[]> {
  const response = await api.get<StorePurchase[]>("/store/purchases");

  return response.data;
}

export async function getPurchaseDelivery(
  purchaseId: string,
): Promise<PurchaseDelivery> {
  const response = await api.get<PurchaseDelivery>(
    `/store/purchases/${purchaseId}/delivery`,
  );

  return response.data;
}

export async function downloadPurchaseCsv(purchaseId: string): Promise<void> {
  const response = await api.get(
    `/store/purchases/${purchaseId}/delivery.csv`,
    {
      responseType: "blob",
    },
  );

  const contentTypeHeader = response.headers["content-type"];

  const contentType =
    typeof contentTypeHeader === "string"
      ? contentTypeHeader
      : "text/csv;charset=utf-8";

  const blob = new Blob([response.data], {
    type: contentType,
  });

  const disposition = response.headers["content-disposition"];

  const filenameMatch =
    typeof disposition === "string"
      ? disposition.match(/filename="?([^"]+)"?/i)
      : null;

  const filename = filenameMatch?.[1] || `hardt-compra-${purchaseId}.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
