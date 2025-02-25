import { Home, Plus, User } from "lucide-react";

export const navigation = [
    {
        name: "Home",
        to: "/",
        icon: Home,
        path: "/_authenticated/",
    },
    {
        name: "Add Game",
        to: "/games/add",
        icon: Plus,
        path: "/_authenticated/games/add",
    },
    {
        name: "Profile",
        to: "/profile",
        icon: User,
        path: "/_authenticated/profile",
    },
] as const;
