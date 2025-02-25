# Table Tweaks Development Guide

## Build Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm tauri` - Run Tauri commands
- `pnpm ios:dev` - Run iOS development build
- `pnpm gen-types` - Generate Supabase types
- `pnpm supabase:start` - Start Supabase local instance
- `pnpm functions` - Run Supabase functions locally

## Code Style Guidelines
- **Imports**: Use absolute imports with `@/` prefix (e.g., `import { Button } from "@/components/ui/button"`)
- **Types**: Use strict typing (TypeScript `strict: true`), avoid `any`
- **Naming**: React components use PascalCase, files use kebab-case, functions use camelCase
- **Components**: Follow shadcn/ui patterns for UI components
- **State Management**: Use React Query for server state, React context for shared state
- **Formatting**: Prefer destructuring, use TypeScript generics appropriately
- **Error Handling**: Use try/catch for async operations, handle all Promise rejections
- **File Structure**: Place components in appropriate directories (ui, layout, feature-specific)
- **Tests**: TBD

## Cursor Rules
- All Cursor rule files (.mdc) must be placed in the `.cursor/rules/` directory
- Use kebab-case for rule filenames with .mdc extension