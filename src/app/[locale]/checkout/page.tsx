import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../lib/i18n/locale";
import { requireCustomer } from "../../../../lib/auth/customer";

const CheckoutClient = dynamic(
  () => import("../../../components/storefront/CheckoutClient").then((mod) => mod.CheckoutClient),
  { loading: () => <div className="mt-4 h-64 rounded-2xl bg-slate-100 shimmer-skeleton" /> },
);

type LocalizedCheckoutPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    order_no?: string;
    promptpay_url?: string;
    selected?: string;
    payment_mode?: string;
    qr_image_url?: string;
    bank_name?: string;
    bank_account_no?: string;
    bank_account_name?: string;
  }>;
};

export default async function LocalizedCheckoutPage({ params, searchParams }: LocalizedCheckoutPageProps) {
  const locale = (await params).locale.toLowerCase();
  if (locale !== "th" && locale !== "en" && locale !== "lo") {
    notFound();
  }

  await requireCustomer();
  const query = await searchParams;
  const orderNo = typeof query.order_no === "string" ? query.order_no : "";
  const promptpayUrl = typeof query.promptpay_url === "string" ? query.promptpay_url : "";
  const paymentMode = query.payment_mode === "bank_qr" ? "bank_qr" : "promptpay";
  const qrImageUrl = typeof query.qr_image_url === "string" ? query.qr_image_url : "";
  const bankName = typeof query.bank_name === "string" ? query.bank_name : "";
  const bankAccountNo = typeof query.bank_account_no === "string" ? query.bank_account_no : "";
  const bankAccountName = typeof query.bank_account_name === "string" ? query.bank_account_name : "";
  const selectedIds =
    typeof query.selected === "string" ? query.selected.split(",").map((id) => id.trim()).filter(Boolean) : [];

  return (
    <CheckoutClient
      initialOrderNo={orderNo}
      initialPromptpayUrl={promptpayUrl}
      initialPaymentMode={paymentMode}
      initialQrImageUrl={qrImageUrl}
      initialBankName={bankName}
      initialBankAccountNo={bankAccountNo}
      initialBankAccountName={bankAccountName}
      initialSelectedIds={selectedIds}
      locale={locale as AppLocale}
      useLocalePrefix
    />
  );
}

