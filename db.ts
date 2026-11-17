import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS stickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        imagem TEXT NOT NULL,
        categoria TEXT NOT NULL
    );
`);

export { db };
