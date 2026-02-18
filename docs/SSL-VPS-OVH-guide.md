# Guide SSL sur VPS OVH (Ubuntu/Debian)

**Résumé :** Générer CSR + clé privée → commander le certificat chez OVH (ou Let's Encrypt) → installer les fichiers → configurer Apache ou Nginx → forcer HTTPS → vérifier.

---

## 1. Génération de la clé privée et du CSR

Sur le VPS, créer un répertoire dédié et générer la clé + le CSR.

```bash
sudo mkdir -p /etc/ssl/private
sudo chmod 700 /etc/ssl/private
```

**Clé privée (RSA 2048 bits) :**

```bash
sudo openssl genrsa -out /etc/ssl/private/mondomaine.key 2048
```
→ Fichier à ne jamais partager. OVH n’a pas besoin de la clé.

**CSR (Certificate Signing Request) :**

```bash
sudo openssl req -new -key /etc/ssl/private/mondomaine.key -out /etc/ssl/private/mondomaine.csr
```
→ Répondre aux questions (pays, région, ville, organisation, CN = nom de domaine exact, ex. `badgeuse.promoveo.fr`). Envoyer le **contenu de `mondomaine.csr`** à OVH pour obtenir le certificat.

**Récupérer le CSR pour le copier dans l’interface OVH :**

```bash
sudo cat /etc/ssl/private/mondomaine.csr
```

OVH vous fournit ensuite :
- le certificat (`.crt` ou `.pem`)
- éventuellement un **CA-Bundle** (chaîne intermédiaire)

---

## 2. Installation des fichiers reçus

**Emplacement recommandé :**

| Fichier        | Emplacement type              |
|----------------|-------------------------------|
| Clé privée     | `/etc/ssl/private/mondomaine.key` (déjà en place) |
| Certificat     | `/etc/ssl/certs/mondomaine.crt` |
| Chaîne (bundle)| `/etc/ssl/certs/mondomaine.ca-bundle` ou inclus dans le .crt |

**Créer le certificat et le bundle :**

```bash
sudo nano /etc/ssl/certs/mondomaine.crt
```
→ Coller le certificat fourni par OVH (bloc `-----BEGIN CERTIFICATE-----` … `-----END CERTIFICATE-----`), sauvegarder.

Si OVH donne un fichier chaîne séparé :

```bash
sudo nano /etc/ssl/certs/mondomaine.ca-bundle
```
→ Coller la chaîne intermédiaire, sauvegarder.

**Droits :**

```bash
sudo chmod 644 /etc/ssl/certs/mondomaine.crt
sudo chmod 600 /etc/ssl/private/mondomaine.key
```

---

## 3. Configuration Apache

**Activer le module SSL :**

```bash
sudo a2enmod ssl
sudo a2enmod rewrite
```

**VirtualHost HTTPS** (créer ou éditer un fichier sous `/etc/apache2/sites-available/`, ex. `mondomaine-ssl.conf`) :

```apache
<IfModule mod_ssl.c>
  <VirtualHost *:443>
    ServerName badgeuse.promoveo.fr
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile      /etc/ssl/certs/mondomaine.crt
    SSLCertificateKeyFile   /etc/ssl/private/mondomaine.key
    SSLCertificateChainFile /etc/ssl/certs/mondomaine.ca-bundle

    <Directory /var/www/html>
      AllowOverride All
      Require all granted
    </Directory>
  </VirtualHost>
</IfModule>
```

→ Si la chaîne est incluse dans le `.crt`, supprimer la ligne `SSLCertificateChainFile` ou commenter-la.

**Activer le site et recharger Apache :**

```bash
sudo a2ensite mondomaine-ssl.conf
sudo systemctl reload apache2
```

**Redirection HTTP → HTTPS** : virtualhost port 80 (souvent dans `000-default.conf` ou un fichier dédié) :

```apache
<VirtualHost *:80>
  ServerName badgeuse.promoveo.fr
  Redirect permanent / https://badgeuse.promoveo.fr/
</VirtualHost>
```

```bash
sudo systemctl reload apache2
```

---

## 4. Configuration Nginx

**Bloc HTTPS** dans un fichier sous `/etc/nginx/sites-available/` (ex. `mondomaine`) :

```nginx
server {
  listen 443 ssl;
  server_name badgeuse.promoveo.fr;
  root /var/www/html;

  ssl_certificate     /etc/ssl/certs/mondomaine.crt;
  ssl_certificate_key /etc/ssl/private/mondomaine.key;
  ssl_trusted_certificate /etc/ssl/certs/mondomaine.ca-bundle;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

→ Si pas de fichier bundle séparé, utiliser uniquement `ssl_certificate` et `ssl_certificate_key` (chaîne souvent déjà dans le .crt).

**Activer le site et tester :**

```bash
sudo ln -sf /etc/nginx/sites-available/mondomaine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Redirection HTTP → HTTPS** : bloc port 80 dans le même fichier (ou dans `default`) :

```nginx
server {
  listen 80;
  server_name badgeuse.promoveo.fr;
  return 301 https://$server_name$request_uri;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. Vérification SSL

**Test du certificat avec OpenSSL :**

```bash
openssl s_client -connect badgeuse.promoveo.fr:443 -servername badgeuse.promoveo.fr </dev/null 2>/dev/null | openssl x509 -noout -dates -subject -issuer
```
→ Affiche dates de validité, sujet et émetteur.

**Vérifier que la chaîne est complète (pas d’erreur) :**

```bash
openssl s_client -connect badgeuse.promoveo.fr:443 -servername badgeuse.promoveo.fr -showcerts </dev/null 2>/dev/null
```
→ Pas de message du type "verify return code: 21 (unable to verify the first certificate)".

**Test rapide depuis le navigateur :**  
Ouvrir `https://badgeuse.promoveo.fr` → cadenas vert, pas d’avertissement.

**Vérifier la redirection HTTP → HTTPS :**

```bash
curl -sI http://badgeuse.promoveo.fr/ | head -5
```
→ Doit contenir `Location: https://badgeuse.promoveo.fr/` et éventuellement `301` ou `302`.

---

## 6. Dépannage rapide

| Problème | Action |
|----------|--------|
| `unable to verify the first certificate` | Ajouter/renseigner correctement le CA-Bundle (chaîne intermédiaire) dans Apache/Nginx. |
| `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` | Vérifier que le vhost écoute bien sur 443 et que `ssl on` / `listen 443 ssl` est présent. |
| Permission denied sur `.key` | `sudo chmod 600 /etc/ssl/private/mondomaine.key` et propriétaire adapté (ex. `root` ou `www-data` selon config). |
| Apache/Nginx ne démarre pas après modif | `sudo apache2ctl configtest` ou `sudo nginx -t` puis corriger les erreurs indiquées. |
| Port 443 fermé | Ouvrir le port 443 (pare-feu : `ufw allow 443/tcp && sudo ufw reload`). |

---

## 7. Alternative : Let's Encrypt (gratuit, renouvellement auto)

Si tu préfères un certificat gratuit et automatique :

```bash
sudo apt update
sudo apt install certbot
```

**Avec Apache :**

```bash
sudo certbot --apache -d badgeuse.promoveo.fr
```

**Avec Nginx :**

```bash
sudo certbot --nginx -d badgeuse.promoveo.fr
```

Certbot pose les questions, configure le vhost et le renouvellement (cron). Redirection HTTP → HTTPS proposée pendant l’installation.

**Renouvellement manuel (test) :** `sudo certbot renew --dry-run`

---

Fichiers à retenir :
- **Clé :** `/etc/ssl/private/mondomaine.key`
- **Certificat :** `/etc/ssl/certs/mondomaine.crt`
- **Chaîne (si fournie) :** `/etc/ssl/certs/mondomaine.ca-bundle`

Adapte `mondomaine` et `badgeuse.promoveo.fr` à ton domaine et à ton chemin DocumentRoot (ex. app Node/Svelte derrière reverse proxy).

---

## Lancer l’app en prod (adapter-node)

Avec **adapter-node**, il ne faut **pas** utiliser `npm run preview` (réservé à d’autres adapters). Pour un run type prod en local ou sur le VPS :

1. **Build** : `npm run build`
2. **Lancer** : `npm run start` (ou `node -r dotenv/config build/index.js`)
3. Lancer depuis la **racine du projet** (là où se trouvent `package.json`, `.env` et le dossier `build/`), pour que le `.env` soit chargé et que `DATABASE_URL=./badgeuse.db` pointe au bon endroit.
4. Ouvrir **http://localhost:3123** (ou le `PORT` défini dans ton `.env`).

Si tu vois « connection failed » : vérifier dans le **terminal** le message affiché au démarrage. Tu dois voir `Listening on http://0.0.0.0:3123`. Si le process plante avant, l’erreur s’affiche là (ex. `Invalid ORIGIN`, problème sql.js, etc.).

---

## Variable ORIGIN (SvelteKit en prod)

Pour que les form actions (ex. formulaire de login) ne renvoient pas **403 Forbidden** en production, SvelteKit doit connaître l’URL de base du site (vérification CSRF).

Sur le VPS, dans le `.env` ou l’environnement du process Node, définir :

```bash
# Si accès par IP
ORIGIN=http://51.178.136.9:3123

# Ou si accès par domaine (avec HTTPS)
ORIGIN=https://badgeuse.promoveo.fr
```

`ORIGIN` doit être exactement l’URL utilisée dans le navigateur (schéma + host + port si présent).

**Important :** le `.env` doit être chargé au démarrage. Si tu lances avec `npm start`, c’est fait (`dotenv/config`). Si tu utilises systemd ou un autre lanceur, soit tu définis `ORIGIN` (et les autres variables) dans l’environnement du service (ex. `EnvironmentFile=/opt/badgeuse/.env`), soit tu lances depuis le répertoire de l’app avec `node -r dotenv/config build/index.js`. Sans ça, l’adapter Node suppose le protocole **https** par défaut et les requêtes en **http** sont refusées (403).

### Vérifier que le login fonctionne

1. **Sur le VPS** : Vérifier que `ORIGIN` est bien défini dans l’environnement du process (`.env` ou `systemctl show ton-service --property=Environment`).
2. **Build à jour** : `npm run build` puis redéployer `build/` et redémarrer le serveur Node.
3. **Dans le navigateur** : Ouvre l’URL exacte utilisée en prod (ex. `http://51.178.136.9:3123` ou `https://badgeuse.promoveo.fr`).
4. **Ouvre la console (F12)** : pas d’erreur au chargement de la page.
5. **Saisis un code valide** (ex. celui défini dans `CODE_EMPLOYE` ou `CODE_PATRON`) puis clique sur Connexion.
6. **Résultat attendu** : redirection vers `/dashboard` sans erreur 403 dans l’onglet Network et sans `TypeError: E is not a function` dans la console.
7. **Code invalide** : saisir un code au hasard → le message « Code invalide » doit s’afficher sous le formulaire (pas de 403, pas de crash).
