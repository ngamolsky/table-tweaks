export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      game_images: {
        Row: {
          game_id: string;
          id: string;
          image_type: Database["public"]["Enums"]["image_type"];
          image_url: string;
          is_cover: boolean | null;
          is_external: boolean | null;
          uploaded_at: string;
          uploader_id: string;
        };
        Insert: {
          game_id: string;
          id?: string;
          image_type: Database["public"]["Enums"]["image_type"];
          image_url: string;
          is_cover?: boolean | null;
          is_external?: boolean | null;
          uploaded_at?: string;
          uploader_id: string;
        };
        Update: {
          game_id?: string;
          id?: string;
          image_type?: Database["public"]["Enums"]["image_type"];
          image_url?: string;
          is_cover?: boolean | null;
          is_external?: boolean | null;
          uploaded_at?: string;
          uploader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_images_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      game_player_counts: {
        Row: {
          created_at: string | null;
          game_id: string;
          id: string;
          player_count: number;
          recommendation: string;
          votes: number;
        };
        Insert: {
          created_at?: string | null;
          game_id: string;
          id?: string;
          player_count: number;
          recommendation: string;
          votes?: number;
        };
        Update: {
          created_at?: string | null;
          game_id?: string;
          id?: string;
          player_count?: number;
          recommendation?: string;
          votes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "game_player_counts_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      game_rules: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          game_id: string;
          id: string;
          last_attempt_at: string | null;
          processed_at: string | null;
          processing_attempts: number | null;
          processing_progress: Json | null;
          processing_request_id: string | null;
          processing_status:
            | Database["public"]["Enums"]["processing_status"]
            | null;
          raw_text: string | null;
          structured_content: Json | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          game_id: string;
          id?: string;
          last_attempt_at?: string | null;
          processed_at?: string | null;
          processing_attempts?: number | null;
          processing_progress?: Json | null;
          processing_request_id?: string | null;
          processing_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null;
          raw_text?: string | null;
          structured_content?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          game_id?: string;
          id?: string;
          last_attempt_at?: string | null;
          processed_at?: string | null;
          processing_attempts?: number | null;
          processing_progress?: Json | null;
          processing_request_id?: string | null;
          processing_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null;
          raw_text?: string | null;
          structured_content?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "game_rules_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      game_tag_relations: {
        Row: {
          created_at: string | null;
          game_id: string;
          tag_id: string;
        };
        Insert: {
          created_at?: string | null;
          game_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string | null;
          game_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_tag_relations_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_tag_relations_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "game_tags";
            referencedColumns: ["id"];
          },
        ];
      };
      game_tags: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          type: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          type?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          author_id: string;
          bgg_id: string | null;
          bgg_image_url: string | null;
          bgg_rating: number | null;
          bgg_thumbnail_url: string | null;
          bgg_weight: number | null;
          bgg_year_published: number | null;
          cover_image_id: string | null;
          created_at: string;
          description: string | null;
          estimated_time: string | null;
          has_complete_rules: boolean | null;
          id: string;
          language_dependence: number | null;
          max_players: number | null;
          min_age: number | null;
          min_players: number | null;
          name: string;
          status: Database["public"]["Enums"]["game_status"];
          updated_at: string;
        };
        Insert: {
          author_id: string;
          bgg_id?: string | null;
          bgg_image_url?: string | null;
          bgg_rating?: number | null;
          bgg_thumbnail_url?: string | null;
          bgg_weight?: number | null;
          bgg_year_published?: number | null;
          cover_image_id?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_time?: string | null;
          has_complete_rules?: boolean | null;
          id?: string;
          language_dependence?: number | null;
          max_players?: number | null;
          min_age?: number | null;
          min_players?: number | null;
          name: string;
          status?: Database["public"]["Enums"]["game_status"];
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          bgg_id?: string | null;
          bgg_image_url?: string | null;
          bgg_rating?: number | null;
          bgg_thumbnail_url?: string | null;
          bgg_weight?: number | null;
          bgg_year_published?: number | null;
          cover_image_id?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_time?: string | null;
          has_complete_rules?: boolean | null;
          id?: string;
          language_dependence?: number | null;
          max_players?: number | null;
          min_age?: number | null;
          min_players?: number | null;
          name?: string;
          status?: Database["public"]["Enums"]["game_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "games_cover_image_id_fkey";
            columns: ["cover_image_id"];
            isOneToOne: false;
            referencedRelation: "game_images";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      ai_model:
        | "openai__gpt-4o-mini"
        | "openai__gpt-4o-2024-11-20"
        | "anthropic__claude-3-5-sonnet-20241022"
        | "anthropic__claude-3-haiku-20240307";
      game_status: "draft" | "published" | "archived" | "under_review";
      image_type: "rules" | "cover" | "component" | "game_state" | "other";
      metadata_type: "rules" | "examples" | "scoring" | "pieces";
      processing_status:
        | "pending"
        | "processing"
        | "completed"
        | "error"
        | "queued"
        | "retrying";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (
      & Database[PublicTableNameOrOptions["schema"]]["Tables"]
      & Database[PublicTableNameOrOptions["schema"]]["Views"]
    )
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database } ? (
    & Database[PublicTableNameOrOptions["schema"]]["Tables"]
    & Database[PublicTableNameOrOptions["schema"]]["Views"]
  )[TableName] extends {
    Row: infer R;
  } ? R
  : never
  : PublicTableNameOrOptions extends keyof (
    & PublicSchema["Tables"]
    & PublicSchema["Views"]
  ) ? (
      & PublicSchema["Tables"]
      & PublicSchema["Views"]
    )[PublicTableNameOrOptions] extends {
      Row: infer R;
    } ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
  } ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    } ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
  } ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    } ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]][
      "CompositeTypes"
    ]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][
    CompositeTypeName
  ]
  : PublicCompositeTypeNameOrOptions extends
    keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;
