import type { Handle } from '@sveltejs/kit';

const publicPaths = ['/', '/login'];

export const handle: Handle = async ({ event, resolve }) => {
  const session = event.cookies.get('badgeuse_role');
  if (session === 'employe' || session === 'patron') {
    event.locals.role = session;
  } else {
    event.locals.role = null;
  }

  if (!event.locals.role && !publicPaths.some((p) => event.url.pathname === p)) {
    return Response.redirect(new URL('/login', event.url.origin), 302);
  }

  return resolve(event);
};
