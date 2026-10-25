import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // Hash URLs (#/pos) so the built app works when served from any folder.
    ...(typeof window !== "undefined" ? { history: createHashHistory() } : {}),
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
