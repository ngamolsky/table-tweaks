import { Tables } from "./database.types";

export type GameWithImages = Tables<"games"> & {
    rules_images: Tables<"rules_images">[];
    example_images: Tables<"example_images">[];
};
