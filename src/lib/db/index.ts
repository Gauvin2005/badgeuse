import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as schema from './schema';

const dbPath = process.env.DATABASE_URL ?? './badgeuse.db';

const SQL = await initSqlJs();
const fileBuffer = existsSync(dbPath) ? readFileSync(dbPath) : null;
const sqlite = new SQL.Database(fileBuffer ?? undefined);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS pointages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    arrivee INTEGER NOT NULL,
    depart INTEGER,
    duree_minutes INTEGER
  );
  CREATE TABLE IF NOT EXISTS absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    debut INTEGER NOT NULL,
    fin INTEGER NOT NULL,
    titre TEXT NOT NULL,
    description TEXT NOT NULL,
    note_employe TEXT DEFAULT '',
    note_patron TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );
`);

function save() {
	try {
		const data = sqlite.export();
		writeFileSync(dbPath, Buffer.from(data));
	} catch (_) {}
}
const saveInterval = setInterval(save, 10_000);
const onExit = () => {
	clearInterval(saveInterval);
	save();
};
process.on('exit', onExit);
process.on('SIGINT', () => {
	onExit();
	process.exit(0);
});
process.on('SIGTERM', () => {
	onExit();
	process.exit(0);
});

export const db = drizzle(sqlite, { schema });
export * from './schema';
