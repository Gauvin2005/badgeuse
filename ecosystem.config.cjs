/**
 * PM2 : lance build/index.js avec dotenv chargé depuis ce dossier.
 * À lancer depuis la racine du projet badgeuse, ou avec le chemin absolu vers ce fichier.
 *
 * Sur le serveur (depuis dqvdcs2/badgeuse/badgeuse) :
 *   pm2 delete all
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'badgeuse',
      script: 'build/index.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      env: { NODE_ENV: 'production' },
    },
  ],
};
