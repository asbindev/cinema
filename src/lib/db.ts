
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

// Ensure sqlite3 is verbose in development for easier debugging
if (process.env.NODE_ENV === 'development') {
  sqlite3.verbose();
}

let db: Database | null = null;

export async function getDb() {
  if (!db) {
    try {
      db = await open({
        filename: './mydb.sqlite', // This file will be created in your project root
        driver: sqlite3.Database
      });

      // Ensure the movies table exists
      await db.exec(`
        CREATE TABLE IF NOT EXISTS movies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          posterUrl TEXT,
          duration INTEGER, -- in minutes
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Example: Add more tables as needed
      // await db.exec(\`
      //   CREATE TABLE IF NOT EXISTS users (
      //     id INTEGER PRIMARY KEY AUTOINCREMENT,
      //     email TEXT UNIQUE NOT NULL,
      //     password TEXT NOT NULL, 
      //     role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      //     createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      //   );
      // \`);

      console.log('Database connected and tables ensured.');
    } catch (error) {
      console.error('Failed to connect to the database or ensure tables:', error);
      throw error; // Re-throw the error to indicate failure
    }
  }
  return db;
}
