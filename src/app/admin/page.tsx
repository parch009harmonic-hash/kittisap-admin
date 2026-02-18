const KPI_CARDS = [
  { label: "Orders Today", labelTh: "ออเดอร์วันนี้", value: "128", hint: "+12% vs yesterday" },
  { label: "Revenue Today", labelTh: "รายได้วันนี้", value: "THB 84,500", hint: "+8% vs yesterday" },
  { label: "Pending", labelTh: "รอดำเนินการ", value: "23", hint: "Need confirmation" },
  { label: "Low Stock", labelTh: "สต็อกต่ำ", value: "9", hint: "Products below threshold" },
];

const RECENT_ORDERS = [
  { id: "#ORD-1042", customer: "Napat C.", total: "THB 1,290", status: "Paid" },
  { id: "#ORD-1041", customer: "Suda P.", total: "THB 2,450", status: "Pending" },
  { id: "#ORD-1040", customer: "Korn T.", total: "THB 890", status: "Processing" },
  { id: "#ORD-1039", customer: "Mali S.", total: "THB 3,100", status: "Paid" },
];

function statusClass(status: string) {
  if (status === "Paid") return "bg-emerald-100 text-emerald-700";
  if (status === "Pending") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.3em] text-blue-600">Dashboard</span>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-900">
          Dashboard / แดชบอร์ด
        </h1>
        <p className="text-sm text-slate-600">Overview of today&apos;s admin activity</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <article key={card.label} className="sst-card-soft rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-900">{card.label}</p>
            <p className="text-xs text-slate-500">{card.labelTh}</p>
            <p className="mt-2 text-3xl font-semibold text-blue-700">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="sst-card-soft overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 px-4 py-4 md:px-5">
          <h2 className="font-heading text-xl font-semibold text-slate-900">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium md:px-5">Order ID</th>
                <th className="px-4 py-3 font-medium md:px-5">Customer</th>
                <th className="px-4 py-3 font-medium md:px-5">Total</th>
                <th className="px-4 py-3 font-medium md:px-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ORDERS.map((order) => (
                <tr key={order.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900 md:px-5">{order.id}</td>
                  <td className="px-4 py-3 md:px-5">{order.customer}</td>
                  <td className="px-4 py-3 md:px-5">{order.total}</td>
                  <td className="px-4 py-3 md:px-5">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
