# Brief : Badgeuse (one-shot)

## Contexte
- **Utilisateurs** : 2 uniquement — l’employé (moi) et le patron. Même app, deux rôles.
- **Hébergement** : site web sur VPS OVH (Node + base de données + SMTP pour les mails).

## Authentification
- **Connexion par code secret** : pas d’email/mot de passe. Chaque personne a un code (ex. 6–8 caractères) qui identifie son rôle.
  - Un code = employé (moi), l’autre = patron.
  - Les codes sont configurables (variables d’environnement ou config).
- Pas de "mot de passe oublié" / récupération de code.

## Rôle employé (moi)
- **Pointage / Dépointage**
  - Un bouton (ou action) "Se pointer" → je suis marqué **présent** jusqu’au dépointage.
  - Un bouton "Se dépointer" → fin de la présence. La durée de présence (heures) est calculée et enregistrée (date, heure arrivée, heure départ, durée).
- **Absences**
  - Créer une absence : **période** (date + heure de début, date + heure de fin), **titre**, **description**.
  - Une **note** par absence (champ libre, côté employé).
- **Vue**
  - Calendrier pour voir mes absences déjà déclarées (et celles visibles par le patron).
  - Tableau de bord / liste de mes pointages et de mes absences.

## Rôle patron
- **Vue**
  - Tableau de bord : liste des pointages (date, arrivée, départ, durée) + liste des absences (période, titre, description) + calendrier. Filtre par mois (ou période).
- **Absences**
  - Voir toutes les absences. Pouvoir ajouter **une note par absence** (champ libre côté patron).
- **Notification**
  - À chaque **nouvelle absence soumise** par l’employé, le patron reçoit un **email** (sujet + contenu : période, titre, description de l’absence).

## Données à stocker
- **Pointages** : qui, date/heure arrivée, date/heure départ, durée calculée.
- **Absences** : qui, date/heure début, date/heure fin, titre, description, note employé, note patron.
- Pas de gestion des pauses : la durée de présence = entre pointage et dépointage.

## Stack / déploiement
- **Web** : Next.js ou SvelteKit (au choix du dev).
- **Base** : SQLite ou Postgres (adapté au VPS OVH).
- **Mails** : envoi SMTP (config OVH via variables d’environnement).
- Prévoir config par env : codes d’authentification, SMTP, URL du site si besoin pour les liens dans les mails.

## Résumé fonctionnel
1. Login par code → rôle employé ou patron.
2. Employé : pointer / dépointer (enregistrement des heures), créer absences (période, titre, description, note), voir calendrier + tableau de bord.
3. Patron : tableau de bord (pointages + absences + calendrier, filtre par mois), note par absence, email à chaque nouvelle absence.
4. Pas de pause dédiée ; pas de récupération de code.
