import { Pool } from 'pg';
import { getDatabaseConnectionString, logDatabaseConfig } from '../../src/config/database';

// Database connection utility for API routes
export class DatabaseConnection {
  private static pool: Pool | null = null;
  private static connectionString: string;

  static initialize() {
    // Use the configuration switch to determine which database to use
    this.connectionString = getDatabaseConnectionString();
    
    // Log the configuration for debugging
    logDatabaseConfig();
    
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      });

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
      });
    }
  }

  static async getClient() {
    if (!this.pool) {
      this.initialize();
    }
    return this.pool!.connect();
  }

  static async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  static async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      this.initialize();
    }
    
    const client = await this.pool!.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }
}

// Initialize connection on module load
DatabaseConnection.initialize(); 