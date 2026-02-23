export function AuthPageSkeleton() {
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] px-3 py-3 text-amber-50 md:px-4 md:py-10">
      <section className="mx-auto flex w-full max-w-md min-h-[calc(100dvh-1.5rem)] flex-col justify-center rounded-3xl border border-amber-500/35 bg-black/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:min-h-0 md:p-8">
        <div className="mx-auto h-20 w-20 animate-pulse rounded-2xl bg-amber-300/20" />
        <div className="mt-4 h-3 w-36 animate-pulse rounded bg-amber-300/20" />
        <div className="mt-3 h-8 w-44 animate-pulse rounded bg-amber-300/20" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-amber-200/20" />

        <div className="mt-6 space-y-3">
          <div className="h-12 w-full animate-pulse rounded-xl bg-amber-200/20" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-amber-200/20" />
          <div className="h-12 w-full animate-pulse rounded-full bg-amber-300/30" />
        </div>
      </section>
    </main>
  );
}
