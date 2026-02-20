import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, pointages, absences } from '$lib/db';

export const POST: RequestHandler = async () => {
	if (process.env.NODE_ENV !== 'development') {
		return json({ ok: false, error: 'Uniquement en mode dev' }, { status: 403 });
	}
	await db.delete(pointages);
	await db.delete(absences);
	return json({ ok: true });
};
