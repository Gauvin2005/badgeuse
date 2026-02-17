import nodemailer from 'nodemailer';
import type { Absence } from '$lib/db/schema';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? process.env.SMTP_USER;
const TO_PATRON = process.env.MAIL_PATRON ?? process.env.SMTP_USER;
const SITE_URL = process.env.SITE_URL ?? '';

export async function sendAbsenceNotification(absence: Absence): Promise<void> {
  if (!TO_PATRON || !FROM) return;

  const debut = absence.debut instanceof Date ? absence.debut : new Date(absence.debut);
  const fin = absence.fin instanceof Date ? absence.fin : new Date(absence.fin);

  await transporter.sendMail({
    from: FROM,
    to: TO_PATRON,
    subject: `[Badgeuse] Nouvelle absence : ${absence.titre}`,
    text: `Nouvelle absence déclarée

Période : ${debut.toLocaleString('fr-FR')} → ${fin.toLocaleString('fr-FR')}
Titre : ${absence.titre}
Description : ${absence.description}
${absence.noteEmploye ? `Note employé : ${absence.noteEmploye}` : ''}

${SITE_URL ? `Voir le tableau de bord : ${SITE_URL}/dashboard` : ''}`,
    html: `
      <h2>Nouvelle absence déclarée</h2>
      <p><strong>Période :</strong> ${debut.toLocaleString('fr-FR')} → ${fin.toLocaleString('fr-FR')}</p>
      <p><strong>Titre :</strong> ${absence.titre}</p>
      <p><strong>Description :</strong> ${absence.description}</p>
      ${absence.noteEmploye ? `<p><strong>Note employé :</strong> ${absence.noteEmploye}</p>` : ''}
      ${SITE_URL ? `<p><a href="${SITE_URL}/dashboard">Voir le tableau de bord</a></p>` : ''}
    `,
  });
}
