# Badgeuse

App de pointage et gestion d’absences pour 2 utilisateurs : employé et patron. Connexion par code secret, pas d’email/mot de passe.

## Stack

- **SvelteKit** (SSR, adapter Node pour VPS)
- **SQLite** + Drizzle ORM
- **Nodemailer** (SMTP pour notifier le patron à chaque nouvelle absence)
- **Tailwind CSS**

## Démarrage

```bash
npm install
cp .env.example .env
# Éditer .env : CODE_EMPLOYE, CODE_PATRON, SMTP, MAIL_PATRON
npm run dev
```

**Windows** : `better-sqlite3` nécessite une compilation native (Python + build tools). Si `npm install` échoue, utilise WSL, Docker ou installe [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools). Sur un VPS Linux, les binaires précompilés sont en général utilisés sans souci.

Ouvre http://localhost:5173. Connecte-toi avec le code employé ou patron défini dans `.env`.

## Déploiement (VPS OVH)

- Build : `npm run build`
- Lancer : `node build` (ou via PM2/systemd)
- Configurer les variables d’environnement (codes, SMTP, `DATABASE_URL` en chemin absolu si besoin, `SITE_URL` pour les liens dans les mails).

Les tables SQLite sont créées automatiquement au premier lancement.

## Fonctions

- **Employé** : se pointer / se dépointer, créer des absences (période, titre, description, note), voir calendrier et tableau de bord.
- **Patron** : tableau de bord (pointages + absences + calendrier), filtre par mois, note par absence, email à chaque nouvelle absence déclarée.
