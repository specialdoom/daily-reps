import { OrderStatus } from "./components/OrderStatus";

export const dynamic = "force-dynamic"; // render per request, not at build time

// Server Component: rendered on the server, then the client component below is hydrated.
export default function Page() {
  return (
    <main>
      <h1>Your order</h1>
      <OrderStatus placedAt={new Date(Date.now() - 42 * 60_000).toISOString()} />
    </main>
  );
}
