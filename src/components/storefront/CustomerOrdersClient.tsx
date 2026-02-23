"use client";

import { useEffect, useState } from "react";

type OrderDto = {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  grand_total: number;
  created_at: string;
};

export function CustomerOrdersClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/customer/orders", { cache: "no-store" });
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }

        const payload = (await response.json()) as { ok?: boolean; error?: string; data?: OrderDto[] };
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error ?? "Failed to load orders");
        }

        if (!mounted) return;
        setOrders(payload.data);
      } catch (caught) {
        if (!mounted) return;
        setError(caught instanceof Error ? caught.message : "Failed to load orders");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <h1 className="text-3xl font-semibold text-amber-300">ออเดอร์ของฉัน</h1>
          <p className="mt-2 text-sm text-amber-100/75">แสดงเฉพาะคำสั่งซื้อที่เป็นของบัญชีคุณเท่านั้น</p>
        </header>

        <section className="mt-6 overflow-hidden rounded-2xl border border-amber-500/25 bg-black/45">
          {loading ? <p className="p-4 text-sm text-amber-100/70">Loading...</p> : null}
          {error ? <p className="m-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          {!loading && !error ? (
            orders.length === 0 ? (
              <p className="p-4 text-sm text-amber-100/70">ยังไม่มีคำสั่งซื้อ</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/55 text-amber-100/80">
                    <tr>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Payment</th>
                      <th className="px-4 py-3 text-left">Total</th>
                      <th className="px-4 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-amber-500/15">
                        <td className="px-4 py-3 font-semibold text-amber-100">{order.order_no}</td>
                        <td className="px-4 py-3">{order.status}</td>
                        <td className="px-4 py-3">{order.payment_status}</td>
                        <td className="px-4 py-3 font-semibold text-amber-300">THB {Number(order.grand_total).toLocaleString()}</td>
                        <td className="px-4 py-3">{new Date(order.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </section>
      </section>
    </main>
  );
}
