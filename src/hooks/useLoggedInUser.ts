import { useRouteContext } from "@tanstack/react-router";

export function useLoggedInUser() {
    const { user } = useRouteContext({
        from: "/_authenticated",
    });

    return {
        user: user,
    };
}
