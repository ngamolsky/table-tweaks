import { Home, Plus, User } from "lucide-react";

export const navigation = [
    {
        name: "Home",
        to: "/",
        icon: Home,
        path: "/_authenticated/",
    },

    {
        name: "Profile",
        to: "/profile",
        icon: User,
        path: "/_authenticated/profile",
    },
] as const;
