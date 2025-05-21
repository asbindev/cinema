
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import bcrypt from 'bcryptjs';

// Ensure sqlite3 is verbose in development for easier debugging
if (process.env.NODE_ENV === 'development') {
  sqlite3.verbose();
}

let db: Database | null = null;

async function seedAdminUser(database: Database) {
  const adminEmail = 'admin@test.com';
  const adminPassword = 'Test@123'; // This will be hashed

  try {
    const existingAdmin = await database.get('SELECT id FROM users WHERE email = ? AND role = ?', adminEmail, 'admin');
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await database.run(
        'INSERT INTO users (email, hashedPassword, role, name) VALUES (?, ?, ?, ?)',
        adminEmail,
        hashedPassword,
        'admin',
        'Administrator'
      );
      console.log(`Admin user ${adminEmail} created.`);
    } else {
      console.log(`Admin user ${adminEmail} already exists.`);
    }
  } catch (error) {
    console.error(`Failed to seed admin user ${adminEmail}:`, error);
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
          userId INTEGER, -- Nullable for anonymous/guest bookings initially
          userEmail TEXT, -- For guest bookings or denormalized user email
          seatIds TEXT NOT NULL, -- JSON array of seat IDs: ["A1", "B2"]
          groupSize INTEGER NOT NULL,
          preferencesJson TEXT, -- JSON string of BookingFormState
          bookingTime DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (movieId) REFERENCES movies(id),
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `);
      
      console.log('Database connected and tables (movies, users, bookings) ensured.');

      // Seed the admin user
      await seedAdminUser(db);

    } catch (error) {
      console.error('Failed to connect to the database or ensure tables:', error);
      throw error; // Re-throw the error to indicate failure
    }
  }
  return db;
}
