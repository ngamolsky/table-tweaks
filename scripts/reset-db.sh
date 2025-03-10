#!/bin/bash

# Script to reset the Supabase database and apply the consolidated migration

echo "🗑️  Stopping Supabase services..."
pnpm supabase:stop

echo "🧹 Cleaning up old migrations..."
# Create a backup directory for old migrations
mkdir -p supabase/migrations/backup
# Move all existing migrations except the consolidated one to backup
find supabase/migrations -name "*.sql" -not -name "20250310000000_consolidated_schema.sql" -exec mv {} supabase/migrations/backup/ \;

echo "🚀 Starting Supabase with a fresh database..."
pnpm supabase start

echo "⏳ Waiting for Supabase to start..."
sleep 5

echo "🔄 Applying consolidated migration..."
pnpm supabase db reset

echo "✅ Database reset complete!"
echo "🔍 Generating TypeScript types..."
pnpm gen-types

echo "🎉 All done! Your database has been reset with the consolidated schema." 