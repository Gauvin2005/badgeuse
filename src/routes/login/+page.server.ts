import { redirect, fail } from '@sveltejs/kit';
import { getRoleByCode } from '$lib/auth';
import type { Actions } from './$types';

export const load = async ({ locals }) => {
  if (locals.role) throw redirect(302, '/dashboard');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const code = (data.get('code') as string) ?? '';
    const role = getRoleByCode(code);
    if (!role) {
      return fail(400, { error: 'Code invalide' });
    }
    cookies.set('badgeuse_role', role, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    throw redirect(302, '/dashboard');
  },
};
