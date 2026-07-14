/**
 * Instant skeleton for every tab. Because all (app) pages are force-dynamic
 * server renders, navigation used to show nothing until the server responded,
 * which made tab switches feel slow on mobile. With this boundary the router
 * paints immediately and streams the real page in.
 */
export default function AppLoading() {
  return (
    <section className="mx-auto flex w-full max-w-3xl animate-pulse flex-col gap-6" aria-busy>
      <div>
        <div className="h-7 w-36 rounded-lg bg-gray-200" />
        <div className="mt-2 h-4 w-56 rounded bg-gray-100" />
      </div>
      <div className="h-40 rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5" />
      <div className="h-40 rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5" />
      <div className="h-24 rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5" />
    </section>
  );
}
