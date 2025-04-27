import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

export const Route = createRootRoute({
  component: function RootComponent() {
    const queryClient = new QueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <DevTools />
      </QueryClientProvider>
    );
  },
});

function isTauri() {
  return typeof window !== "undefined" && !!window.__TAURI__;
}

function DevTools() {
  if (isTauri() || !import.meta.env.DEV) {
    return null;
  }
  return (
    <>
      <ReactQueryDevtools />
      <TanStackRouterDevtools />
    </>
  );
}
