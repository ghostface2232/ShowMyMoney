// Route-level skeleton for the asset dashboard content. The header persists in the
// (app) layout, so only the area below it is mocked while RSC data streams in.
export default function HomeLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-3 pb-28 md:px-8">
      <div className="h-28 animate-pulse rounded-xl bg-muted sm:h-24" />
      <div className="space-y-3">
        <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    </main>
  );
}
