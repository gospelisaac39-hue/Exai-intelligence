const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// Uses Node's built-in node:sqlite (stable since Node 22+) instead of
// better-sqlite3 — avoids a native/node-gyp build step entirely, which
// requires a working Python toolchain that isn't guaranteed to be present.
const dbPath = path.resolve(__dirname, '../../', config.db.path);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
