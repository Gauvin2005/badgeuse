import type { Role } from '$lib/db/schema';

const CODE_EMPLOYE = process.env.CODE_EMPLOYE ?? 'employe';
const CODE_PATRON = process.env.CODE_PATRON ?? 'patron';

export function getRoleByCode(code: string): Role | null {
  const c = code.trim();
  if (c === CODE_EMPLOYE) return 'employe';
  if (c === CODE_PATRON) return 'patron';
  return null;
}

export function isEmploye(role: Role): boolean {
  return role === 'employe';
}

export function isPatron(role: Role): boolean {
  return role === 'patron';
}
