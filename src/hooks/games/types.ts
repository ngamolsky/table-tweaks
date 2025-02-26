import { Tables, TablesInsert, TablesUpdate } from "src/types/database.types";

export type Game = Tables<"games">;
export type GameInsert = TablesInsert<"games">;
export type GameUpdate = TablesUpdate<"games">;
export type GameImage = Tables<"game_images">;
export type GameRule = Tables<"game_rules">;
