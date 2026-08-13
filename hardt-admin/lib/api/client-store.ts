import { api } from "@/lib/api/client";


export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  available_stock: number;
};


export type StorePurchase = {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  inventory_item_id: string;
  amount_brl: number;
  status: string;
  completed_at: string | null;
  created_at: string;
};


export type PurchaseDelivery = {
  purchase_id: string;
  product_id: string;
  product_name: string;
  payload: Record<string, unknown>;
};


export async function getStoreProducts(): Promise<
  StoreProduct[]
> {
  const response = await api.get<StoreProduct[]>(
    "/store/products"
  );

  return response.data;
}


export async function purchaseStoreProduct(
  productId: string,
  idempotencyKey: string
): Promise<StorePurchase> {
  const response = await api.post<StorePurchase>(
    "/store/purchases",
    {
      product_id: productId,
      idempotency_key: idempotencyKey,
    }
  );

  return response.data;
}


export async function getStorePurchases(): Promise<
  StorePurchase[]
> {
  const response = await api.get<StorePurchase[]>(
    "/store/purchases"
  );

  return response.data;
}


export async function getPurchaseDelivery(
  purchaseId: string
): Promise<PurchaseDelivery> {
  const response = await api.get<PurchaseDelivery>(
    `/store/purchases/${purchaseId}/delivery`
  );

  return response.data;
}
