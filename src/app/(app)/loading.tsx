// Route-level skeleton for the asset dashboard content. The header persists in the
// (app) layout, so only the area below it is mocked while RSC data streams in.
export default function HomeLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-3 pb-[calc(6rem+max(env(safe-area-inset-bottom),1rem))] md:px-8">
      <div className="h-40 animate-pulse squircle-mask rounded-4xl bg-muted sm:h-28" />
      <div className="space-y-3">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse squircle-mask rounded-4xl bg-muted" />
      </div>
    </main>
  );
}
