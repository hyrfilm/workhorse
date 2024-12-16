import { SQLocal } from 'sqlocal';

// Create a client with a name for the SQLite file to save in
// the origin private file system
const { sql } = new SQLocal('database.sqlite3');

// Use the "sql" tagged template to execute a SQL statement
// against the SQLite database
await sql`CREATE TABLE groceries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`;

await sql`CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, identity TEXT, state INTEGER, retries INTEGER)`;

// Execute a parameterized statement just by inserting 
// parameters in the SQL string
const items = ['bread', 'milk', 'rice'];
for (let item of items) {
  await sql`INSERT INTO groceries (name) VALUES (${item})`;
}

// SELECT queries and queries with the RETURNING clause will
// return the matched records as an array of objects
const data = await sql`SELECT * FROM groceries`;
console.log(data);