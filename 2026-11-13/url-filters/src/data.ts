export type Product = { id: number; name: string; price: number };

export const PRODUCTS: Product[] = [
  "Anvil", "Beacon", "Compass", "Dynamo", "Easel", "Flask", "Gimbal", "Hammer",
  "Ingot", "Jigsaw", "Kettle", "Lantern", "Mallet", "Nozzle", "Opal", "Pulley",
  "Quiver", "Ratchet", "Sprocket", "Trowel", "Urn", "Valve", "Wrench", "Yoke",
].map((name, i) => ({ id: i + 1, name, price: ((i * 37) % 90) + 10 }));

export const PAGE_SIZE = 5;

export function queryProducts(q: string, sort: "name" | "price", page: number) {
  const hits = PRODUCTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  hits.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : a.price - b.price));
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  return { items: hits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), pages, total: hits.length };
}
