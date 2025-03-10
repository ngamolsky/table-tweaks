# Supabase Database Management

This directory contains the Supabase configuration and database migrations for the Table Tweaks application.

## Database Schema

The database schema is defined in the migrations directory. The main schema is consolidated in a single migration file:

- `migrations/20250310000000_consolidated_schema.sql`: Contains the complete database schema

## Resetting the Database

To reset the database and apply the consolidated migration, use the provided script:

```bash
./scripts/reset-db.sh
```

This script will:
1. Stop the Supabase services
2. Back up existing migrations
3. Start Supabase with a fresh database
4. Apply the consolidated migration
5. Generate updated TypeScript types

## Manual Database Operations

If you need to perform manual operations, you can use the following commands:

### Reset the Database

```bash
pnpm supabase db reset
```

### Generate TypeScript Types

```bash
pnpm gen-types
```

### Create a New Migration

```bash
pnpm supabase migration new <migration_name>
```

### Apply Migrations

```bash
pnpm supabase db push
```

## Database Structure

The database includes the following main tables:

- `games`: Main table for game information
- `game_images`: Stores images related to games
- `game_rules`: Stores processed game rules
- `game_tags`: Stores tags for categorizing games
- `game_tag_relations`: Links games to tags
- `game_player_counts`: Stores player count recommendations

## Rules Processing

The database includes a trigger function `update_game_rules_status()` that automatically updates a game's `has_complete_rules` status based on the processing status of its rules.

## Storage

The application uses a Supabase storage bucket named `game_images` for storing game-related images. 