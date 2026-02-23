import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminOrderDetail } from "../../../../../lib/db/admin-orders";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { AdminOrderDetailClient } from "../../../../components/admin/orders/AdminOrderDetailClient";

type AdminOrderDetailPageProps = {
  params: Promise<{ order_no: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const orderNo = (await params).order_no;
  const detail = await getAdminOrderDetail(orderNo);
  const locale = await getAdminLocale();

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/orders" className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-50">
        {locale === "th" ? "กลับหน้าคำสั่งซื้อ" : "Back to Orders"}
      </Link>
      <AdminOrderDetailClient order={detail} locale={locale} />
    </div>
  );
}
