import { unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';

const dbPath = resolve(process.cwd(), process.env.DATABASE_URL || './badgeuse.db');
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
  console.log('BDD supprimée :', dbPath);
} else {
  console.log('Aucun fichier BDD à supprimer :', dbPath);
}
