import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type Role = 'employe' | 'patron';

export const pointages = sqliteTable('pointages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role', { enum: ['employe', 'patron'] }).notNull(),
  arrivee: integer('arrivee', { mode: 'timestamp' }).notNull(),
  depart: integer('depart', { mode: 'timestamp' }),
  dureeMinutes: integer('duree_minutes'),
});

export const absences = sqliteTable('absences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role', { enum: ['employe', 'patron'] }).notNull(),
  debut: integer('debut', { mode: 'timestamp' }).notNull(),
  fin: integer('fin', { mode: 'timestamp' }).notNull(),
  titre: text('titre').notNull(),
  description: text('description').notNull(),
  noteEmploye: text('note_employe').default(''),
  notePatron: text('note_patron').default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Pointage = typeof pointages.$inferSelect;
export type PointageInsert = typeof pointages.$inferInsert;
export type Absence = typeof absences.$inferSelect;
export type AbsenceInsert = typeof absences.$inferInsert;
