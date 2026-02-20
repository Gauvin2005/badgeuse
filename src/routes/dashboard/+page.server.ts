import { redirect } from '@sveltejs/kit';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db, pointages, absences } from '$lib/db';
import type { PageServerLoad, Actions } from './$types';

function getMonthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59);
  return { start, end };
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.role) throw redirect(302, '/login');

  const monthParam = url.searchParams.get('mois') ?? new Date().toISOString().slice(0, 7);
  const { start, end } = getMonthRange(monthParam);

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
    mois: monthParam,
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
