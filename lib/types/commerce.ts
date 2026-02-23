export type CustomerOrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export type CustomerPaymentStatus =
  | "unpaid"
  | "pending_verify"
  | "paid"
  | "failed"
  | "expired";

export type CustomerOrderItemInput = {
  productId: string;
  qty: number;
};

export type CustomerOrderCreateInput = {
  items: CustomerOrderItemInput[];
  couponCode?: string;
  note?: string;
};

export type PaymentSettings = {
  promptpayPhone: string;
  promptpayBaseUrl: string;
  allowCustomAmount: boolean;
  updatedAt: string | null;
};
