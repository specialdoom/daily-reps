import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { ProductsPage } from "./ProductsPage";

export type ProductSearch = {
  q: string;
  sort: "name" | "price";
  page: number;
};

const rootRoute = createRootRoute({ component: () => <Outlet /> });

export const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/products",
  // TODO: validate and normalise the raw search object (see README).
  // Right now the values are passed through unchecked, so the type is a lie.
  validateSearch: (raw: Record<string, unknown>): ProductSearch => raw as ProductSearch,
  component: ProductsPage,
});

const router = createRouter({ routeTree: rootRoute.addChildren([productsRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
