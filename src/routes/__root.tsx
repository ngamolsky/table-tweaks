import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: function RootComponent() {
    const queryClient = new QueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <ReactQueryDevtools />
        <TanStackRouterDevtools />
      </QueryClientProvider>
    );
  },
});
