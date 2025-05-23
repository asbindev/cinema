
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import bcrypt from 'bcryptjs';

// Ensure sqlite3 is verbose in development for easier debugging
if (process.env.NODE_ENV === 'development') {
  sqlite3.verbose();
}

let db: Database | null = null;

async function seedUser(database: Database, email: string, name: string, role: 'user' | 'admin', passwordRaw: string) {
  try {
    const existingUser = await database.get('SELECT id, role FROM users WHERE email = ?', email); // Fetch role as well
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(passwordRaw, 10);
      await database.run(
        'INSERT INTO users (email, hashedPassword, role, name) VALUES (?, ?, ?, ?)',
        email,
        hashedPassword,
        role,
        name
      );
      console.log(`User ${email} (role: ${role}) created.`);
    } else {
      console.log(`User ${email} (role: ${existingUser.role}) already exists.`);
      // Optionally, update role or password if needed for existing users, but be cautious
      // For instance, ensure admin always has admin role:
      if (email === 'admin@gmail.com' && existingUser.role !== 'admin') {
        await database.run('UPDATE users SET role = ? WHERE email = ?', 'admin', email);
        console.log(`User ${email} role updated to admin.`);
      }
    }
  } catch (error) {
    console.error(`Failed to seed user ${email}:`, error);
  }
}

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

      // Ensure the users table exists
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE NOT NULL,
          hashedPassword TEXT NOT NULL, 
          role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Ensure the bookings table exists
      await db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY, -- UUID
          movieId INTEGER NOT NULL,
          movieTitle TEXT NOT NULL, -- Denormalized for easier display
          userId INTEGER NOT NULL, 
          userEmail TEXT NOT NULL, -- Stored from session, for easier display
          seatIds TEXT NOT NULL, -- JSON array of seat IDs: ["A1", "B2"]
          groupSize INTEGER NOT NULL,
          preferencesJson TEXT, -- JSON string of BookingFormState
          bookingTime DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (movieId) REFERENCES movies(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      
      console.log('Database connected and tables (movies, users, bookings) ensured.');

      // Seed users
      await seedUser(db, 'admin@gmail.com', 'Administrator', 'admin', 'Test@123');
      await seedUser(db, 'user@gmail.com', 'Regular User', 'user', 'Test@123');

    } catch (error) {
      console.error('Failed to connect to the database or ensure tables:', error);
      db = null; // Reset db instance on error
      throw error; // Re-throw the error to indicate failure
    }
  }
  return db;
}

