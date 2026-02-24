import dynamic from "next/dynamic";

import { requireCustomer } from "../../../lib/auth/customer";
import { getAppLocale } from "../../../lib/i18n/locale";

const CheckoutClient = dynamic(
  () => import("../../components/storefront/CheckoutClient").then((mod) => mod.CheckoutClient),
  { loading: () => <div className="mt-4 h-64 rounded-2xl bg-slate-100 shimmer-skeleton" /> },
);

type CheckoutPageProps = {
  searchParams: Promise<{ order_no?: string; promptpay_url?: string; selected?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  await requireCustomer();
  const locale = await getAppLocale();
  const params = await searchParams;
  const orderNo = typeof params.order_no === "string" ? params.order_no : "";
  const promptpayUrl = typeof params.promptpay_url === "string" ? params.promptpay_url : "";
  const selectedIds = typeof params.selected === "string" ? params.selected.split(",").map((id) => id.trim()).filter(Boolean) : [];

  return (
    <CheckoutClient
      initialOrderNo={orderNo}
      initialPromptpayUrl={promptpayUrl}
      initialSelectedIds={selectedIds}
      locale={locale}
    />
  );
}
