import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.role) throw redirect(302, '/login');
  throw redirect(302, '/dashboard');
};
