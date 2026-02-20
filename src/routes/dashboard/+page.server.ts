import { redirect } from '@sveltejs/kit';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db, pointages, absences } from '$lib/db';
import type { PageServerLoad, Actions } from './$types';

export type VuePeriod = 'jour' | 'semaine' | 'mois' | 'annee';

function parseDateParam(s: string | null): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m) return new Date();
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/** Retourne start, end et date normalisée (YYYY-MM-DD) pour la période. */
function getRange(
  vue: VuePeriod,
  date: Date
): { start: Date; end: Date; dateKey: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  if (vue === 'jour') {
    const start = new Date(y, m, d, 0, 0, 0);
    const end = new Date(y, m, d, 23, 59, 59);
    const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { start, end, dateKey };
  }

  if (vue === 'semaine') {
    const dayOfWeek = (date.getDay() + 6) % 7; // 0 = lundi
    const lundi = new Date(date);
    lundi.setDate(date.getDate() - dayOfWeek);
    const ly = lundi.getFullYear();
    const lm = lundi.getMonth();
    const ld = lundi.getDate();
    const start = new Date(ly, lm, ld, 0, 0, 0);
    const dimanche = new Date(start);
    dimanche.setDate(dimanche.getDate() + 6);
    const end = new Date(dimanche.getFullYear(), dimanche.getMonth(), dimanche.getDate(), 23, 59, 59);
    const dateKey = `${ly}-${String(lm + 1).padStart(2, '0')}-${String(ld).padStart(2, '0')}`;
    return { start, end, dateKey };
  }

  if (vue === 'mois') {
    const start = new Date(y, m, 1, 0, 0, 0);
    const end = new Date(y, m + 1, 0, 23, 59, 59);
    const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return { start, end, dateKey };
  }

  // annee
  const start = new Date(y, 0, 1, 0, 0, 0);
  const end = new Date(y, 11, 31, 23, 59, 59);
  const dateKey = `${y}-01-01`;
  return { start, end, dateKey };
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.role) throw redirect(302, '/login');

  const vue = (url.searchParams.get('vue') ?? 'mois') as VuePeriod;
  const dateParam = url.searchParams.get('date');
  const date = parseDateParam(dateParam ?? null);
  const { start, end, dateKey } = getRange(vue, date);

  if (locals.role === 'employe') {
    const open = await db
      .select()
      .from(pointages)
      .where(and(eq(pointages.role, 'employe'), sql`${pointages.depart} IS NULL`))
      .limit(1);
    const openPointage = open[0] ?? null;
    if (openPointage) {
      const arr = openPointage.arrivee instanceof Date ? openPointage.arrivee : new Date(openPointage.arrivee as number);
      // 17h00 jour d'arrivée (heure serveur) — en prod, lancer Node avec TZ=Europe/Paris
      const dayEnd17 = new Date(arr.getFullYear(), arr.getMonth(), arr.getDate(), 17, 0, 0, 0);
      if (Date.now() >= dayEnd17.getTime()) {
        const dureeMinutes = Math.round((dayEnd17.getTime() - arr.getTime()) / 60000);
        await db
          .update(pointages)
          .set({ depart: dayEnd17, dureeMinutes })
          .where(eq(pointages.id, openPointage.id));
      }
    }
  }

  const pointagesList = await db
    .select()
    .from(pointages)
    .where(
      locals.role === 'patron'
        ? and(gte(pointages.arrivee, start), lte(pointages.arrivee, end))
        : and(
            eq(pointages.role, 'employe'),
            gte(pointages.arrivee, start),
            lte(pointages.arrivee, end)
          )
    )
    .orderBy(desc(pointages.arrivee));

  const pointagesFiltered = pointagesList;

  const absencesList = await db
    .select()
    .from(absences)
    .where(eq(absences.role, 'employe'))
    .orderBy(desc(absences.createdAt));

  const absencesFiltered = absencesList.filter((a) => {
    const d = a.debut instanceof Date ? a.debut.getTime() : (a.debut as number);
    const e = a.fin instanceof Date ? a.fin.getTime() : (a.fin as number);
    return e >= start.getTime() && d <= end.getTime();
  });

  let enCours: (typeof pointagesList)[0] | null = null;
  if (locals.role === 'employe') {
    const open = await db
      .select()
      .from(pointages)
      .where(and(eq(pointages.role, 'employe'), sql`${pointages.depart} IS NULL`))
      .limit(1);
    enCours = open[0] ?? null;
  }

  return {
    role: locals.role,
    pointages: pointagesFiltered,
    absences: absencesFiltered,
    absencesAll: absencesList,
    enCours,
    vue,
    dateKey,
    periodStart: start.getTime(),
    periodEnd: end.getTime(),
  };
};

export const actions: Actions = {
  pointer: async ({ locals, request }) => {
    if (locals.role !== 'employe') return { success: false };
    const data = await request.formData();
    const arriveeAt = data.get('arriveeAt');
    const arrivee =
      typeof arriveeAt === 'string' && arriveeAt ? new Date(arriveeAt) : new Date();
    if (Number.isNaN(arrivee.getTime())) return { success: false };
    await db.insert(pointages).values({
      role: 'employe',
      arrivee,
    });
    return { success: true };
  },
  depointer: async ({ locals, request }) => {
    if (locals.role !== 'employe') return { success: false };
    const data = await request.formData();
    const departAt = data.get('departAt');
    const depart =
      typeof departAt === 'string' && departAt ? new Date(departAt) : new Date();
    if (Number.isNaN(depart.getTime())) return { success: false };
    const open = await db
      .select()
      .from(pointages)
      .where(and(eq(pointages.role, 'employe'), sql`${pointages.depart} IS NULL`))
      .limit(1);
    const p = open[0];
    if (!p) return { success: false };
    const arrivee = p.arrivee instanceof Date ? p.arrivee : new Date(p.arrivee as number);
    const dureeMinutes = Math.round((depart.getTime() - arrivee.getTime()) / 60000);
    await db
      .update(pointages)
      .set({ depart, dureeMinutes })
      .where(eq(pointages.id, p.id));
    return { success: true };
  },
  absence: async ({ locals, request }) => {
    if (locals.role !== 'employe') return { success: false };
    const data = await request.formData();
    const debut = new Date((data.get('debut') as string) || '');
    const fin = new Date((data.get('fin') as string) || '');
    const titre = (data.get('titre') as string) || '';
    const description = (data.get('description') as string) || '';
    const noteEmploye = (data.get('noteEmploye') as string) || '';
    if (!titre || !debut.getTime() || !fin.getTime()) return { success: false, error: 'Champs requis' };
    const [inserted] = await db
      .insert(absences)
      .values({
        role: 'employe',
        debut,
        fin,
        titre,
        description,
        noteEmploye,
        createdAt: new Date(),
      })
      .returning();
    if (inserted) {
      const { sendAbsenceNotification } = await import('$lib/mail');
      await sendAbsenceNotification(inserted).catch(() => {});
    }
    return { success: true };
  },
  notePatron: async ({ locals, request }) => {
    if (locals.role !== 'patron') return { success: false };
    const data = await request.formData();
    const id = Number(data.get('id'));
    const notePatron = (data.get('notePatron') as string) || '';
    if (!id) return { success: false };
    await db.update(absences).set({ notePatron }).where(eq(absences.id, id));
    return { success: true };
  },
};
