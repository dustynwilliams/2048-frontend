// ============================================================================
// DATABASE CONFIGURATION SWITCH
// ============================================================================
// 
// PURPOSE: Easy toggle between local PostgreSQL and Supabase
// 
// USAGE: 
// - Set USE_SUPABASE = true for Vercel deployment (Supabase)
// - Set USE_SUPABASE = false for local development (Local PostgreSQL)
// 
// ============================================================================

export const DATABASE_CONFIG = {
  // ============================================================================
  // MAIN SWITCH - Change this to toggle between databases
  // ============================================================================
  USE_SUPABASE: true, // true = Supabase, false = Local PostgreSQL
  
  // ============================================================================
  // CONNECTION STRINGS
  // ============================================================================
  LOCAL_POSTGRES: process.env.PG_CONNECTION_STRING || 'postgresql://dustyn:guest@198.48.1.110:5432/ThinkificData',
  
  // Supabase connection strings
  SUPABASE: {
    // For API routes (server-side)
    DIRECT: process.env.SUPABASE_DIRECT_CONNECTION || 'postgresql://postgres:auuZzk8grTTOlbfY@db.qegcjlltbaovypqgaaoi.supabase.co:5432/postgres',
    
    // For client-side (if needed)
    ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZ2NqbGx0YmFvdnlwcWdhYW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODA5ODQsImV4cCI6MjA2ODM1Njk4NH0.ZNhLafgJ0YGh6TvZRgateOf43WjfRCDTOqlNdNNOjJo',
    SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZ2NqbGx0YmFvdnlwcWdhYW9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc4MDk4NCwiZXhwIjoyMDY4MzU2OTg0fQ.f26l5EbBPlCdsFlQLj80sJw9kdrckBmqQ_tbUk51HWE'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDatabaseConnectionString(): string {
  if (DATABASE_CONFIG.USE_SUPABASE) {
    console.log('🔗 Using Supabase database');
    return DATABASE_CONFIG.SUPABASE.DIRECT;
  } else {
    console.log('🔗 Using local PostgreSQL database');
    return DATABASE_CONFIG.LOCAL_POSTGRES;
  }
}

export function isUsingSupabase(): boolean {
  return DATABASE_CONFIG.USE_SUPABASE;
}

// ============================================================================
// CONFIGURATION STATUS
// ============================================================================

export function logDatabaseConfig() {
  console.log('📊 Database Configuration:');
  console.log(`   Use Supabase: ${DATABASE_CONFIG.USE_SUPABASE}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  
  if (DATABASE_CONFIG.USE_SUPABASE) {
    console.log('   Database: Supabase (Cloud)');
  } else {
    console.log('   Database: Local PostgreSQL');
  }
  console.log('---');
} 