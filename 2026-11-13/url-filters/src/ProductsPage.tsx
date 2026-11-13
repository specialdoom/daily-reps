import { useNavigate } from "@tanstack/react-router";
import { productsRoute } from "./main";
import { queryProducts } from "./data";

export function ProductsPage() {
  const search = productsRoute.useSearch();
  const navigate = useNavigate({ from: productsRoute.fullPath });
  const { items, pages, total } = queryProducts(search.q, search.sort, search.page);

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 480, margin: "2rem auto" }}>
      <h1>Products</h1>

      <label>
        Search{" "}
        <input
          type="search"
          value={search.q}
          onChange={(e) =>
            // TODO: changing the query must also reset the page (see README)
            navigate({ search: { ...search, q: e.target.value } })
          }
        />
      </label>{" "}
      <label>
        Sort{" "}
        <select
          value={search.sort}
          onChange={(e) =>
            navigate({ search: { ...search, sort: e.target.value as "name" | "price" } })
          }
        >
          <option value="name">Name</option>
          <option value="price">Price</option>
        </select>
      </label>

      <p aria-live="polite">{total} results</p>
      <ul>
        {items.map((p) => (
          <li key={p.id}>
            {p.name} — ${p.price}
          </li>
        ))}
      </ul>

      <button disabled={search.page <= 1} onClick={() => navigate({ search: { ...search, page: search.page - 1 } })}>
        Previous
      </button>{" "}
      Page {search.page} of {pages}{" "}
      <button disabled={search.page >= pages} onClick={() => navigate({ search: { ...search, page: search.page + 1 } })}>
        Next
      </button>
    </main>
  );
}
