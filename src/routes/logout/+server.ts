import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  cookies.delete('badgeuse_role', { path: '/' });
  throw redirect(302, '/login');
};
