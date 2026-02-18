import Link from "next/link";

export default function Home() {
  return (
    <main className="app-surface min-h-screen">
      <section className="sst-section">
        <div className="sst-container">
          <div className="sst-card-soft rounded-3xl p-7 md:p-10">
            <div className="flex flex-wrap gap-2">
              <span className="sst-pill">Admin Console</span>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
                Mobile + Desktop
              </span>
            </div>

            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Kittisap Admin Platform
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
              ระบบผู้ดูแลแบบ responsive สำหรับ iOS, Android และ desktop พร้อมโทนสีและรูปแบบที่ทันสมัย
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg"
              >
                Sign In
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
