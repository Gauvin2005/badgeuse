CREATE TABLE `pointages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`arrivee` integer NOT NULL,
	`depart` integer,
	`duree_minutes` integer
);

CREATE TABLE `absences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`debut` integer NOT NULL,
	`fin` integer NOT NULL,
	`titre` text NOT NULL,
	`description` text NOT NULL,
	`note_employe` text DEFAULT '',
	`note_patron` text DEFAULT '',
	`created_at` integer NOT NULL
);
