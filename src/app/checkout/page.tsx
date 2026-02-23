import { requireCustomer } from "../../../lib/auth/customer";
import { CheckoutClient } from "../../components/storefront/CheckoutClient";

type CheckoutPageProps = {
  searchParams: Promise<{ order_no?: string; promptpay_url?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  await requireCustomer();
  const params = await searchParams;
  const orderNo = typeof params.order_no === "string" ? params.order_no : "";
  const promptpayUrl = typeof params.promptpay_url === "string" ? params.promptpay_url : "";

  return <CheckoutClient initialOrderNo={orderNo} initialPromptpayUrl={promptpayUrl} />;
}
