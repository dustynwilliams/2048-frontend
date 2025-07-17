# Database Configuration Switch

## Quick Toggle Between Databases

To switch between local PostgreSQL and Supabase, edit this file:

**`src/config/database.ts`**

### For Local Development (Local PostgreSQL):
```typescript
USE_SUPABASE: false, // Change this line
```

### For Vercel Deployment (Supabase):
```typescript
USE_SUPABASE: true, // Change this line
```

## What This Does

- **Local Development**: Connects to your local PostgreSQL database
- **Vercel Deployment**: Connects to Supabase cloud database

## Environment Variables

The configuration automatically uses these environment variables:

### Local PostgreSQL:
- `PG_CONNECTION_STRING` (falls back to your local DB)

### Supabase:
- `SUPABASE_DIRECT_CONNECTION` (falls back to your Supabase connection)
- `SUPABASE_ANON_KEY` (for client-side if needed)
- `SUPABASE_SERVICE_ROLE` (for server-side operations)

## Usage

1. Edit `src/config/database.ts`
2. Change `USE_SUPABASE: true/false`
3. Run your frontend script
4. Check console logs to confirm which database is being used

That's it! No special commands needed. 