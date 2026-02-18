# SSL badgeuse.dqvdcs.fr — Commandes à exécuter sur le VPS

À faire en SSH : `ssh ton_utilisateur@ip_du_serveur`

---

## Partie 1 : Vérifier l’existant (sans rien modifier)

Exécuter ces commandes une par une pour voir ce qui est déjà en place. **Aucune ne modifie le serveur.**

**1. Vérifier si un répertoire SSL existe déjà**
```bash
ls -la /etc/ssl/private 2>/dev/null || echo "Répertoire /etc/ssl/private absent ou vide"
```
```bash
ls -la /etc/ssl/certs/*.crt /etc/ssl/certs/*.pem 2>/dev/null || echo "Aucun certificat trouvé dans /etc/ssl/certs"
```

**2. Savoir quel serveur web tourne (Nginx, Apache, ou les deux)**
```bash
systemctl is-active nginx 2>/dev/null && echo "Nginx actif" || echo "Nginx inactif ou non installé"
```
```bash
systemctl is-active apache2 2>/dev/null && echo "Apache actif" || echo "Apache inactif ou non installé"
```

**3. Lister les sites configurés (Nginx)**
```bash
ls -la /etc/nginx/sites-enabled/ 2>/dev/null
```
```bash
grep -l "server_name\|listen" /etc/nginx/sites-enabled/* 2>/dev/null | xargs -I {} sh -c 'echo "=== {} ===" && cat {}'
```

**4. Lister les sites configurés (Apache)**
```bash
ls -la /etc/apache2/sites-enabled/ 2>/dev/null
```

**5. Vérifier qui écoute sur 80 et 443**
```bash
ss -tlnp | grep -E ':80 |:443 '
```
ou si `ss` n’affiche pas les noms :
```bash
sudo ss -tlnp | grep -E ':80 |:443 '
```

**6. Vérifier si dqvdcs.fr ou badgeuse est déjà mentionné**
```bash
grep -r "dqvdcs\|badgeuse" /etc/nginx/ /etc/apache2/ 2>/dev/null || echo "Aucune occurrence"
```

Une fois que tu as fait tout ça, tu peux m’envoyer le résultat (ou un résumé) si tu veux qu’on valide avant de passer à la génération.

---

## Partie 2 : Créer le répertoire et générer clé + CSR (badgeuse.dqvdcs.fr)

Ces commandes **créent des fichiers**. À exécuter dans l’ordre, une par une.

**1. Créer le répertoire pour la clé privée (s’il n’existe pas)**
```bash
sudo mkdir -p /etc/ssl/private
```
**2. Restreindre l’accès au répertoire (seul root peut lire)**
```bash
sudo chmod 700 /etc/ssl/private
```
**3. Générer la clé privée RSA 2048 bits pour badgeuse.dqvdcs.fr**
```bash
sudo openssl genrsa -out /etc/ssl/private/badgeuse.dqvdcs.fr.key 2048
```
**4. Vérifier que la clé a bien été créée**
```bash
sudo ls -la /etc/ssl/private/badgeuse.dqvdcs.fr.key
```
→ Doit afficher un fichier, permissions 600 ou -rw-------.

**5. Générer le CSR (Certificate Signing Request)**

Cette commande est **interactive** : OpenSSL va demander Pays, Région, Ville, Organisation, etc. Pour le **Common Name (CN)**, répondre exactement : **badgeuse.dqvdcs.fr**

```bash
sudo openssl req -new -key /etc/ssl/private/badgeuse.dqvdcs.fr.key -out /etc/ssl/private/badgeuse.dqvdcs.fr.csr
```

Exemple de réponses possibles (adaptables) :
- Country Name : FR  
- State : (ta région ou "France")  
- Locality : (ville)  
- Organization : (nom de la société / client)  
- Organizational Unit : (optionnel, ou laisser vide)  
- Common Name : **badgeuse.dqvdcs.fr**  ← obligatoire  
- Email : (ton email ou celui du client)  
- Challenge password / Optional company name : laisser vides (Entrée)

**6. Vérifier que le CSR a été créé**
```bash
sudo ls -la /etc/ssl/private/badgeuse.dqvdcs.fr.csr
```
**7. Afficher le contenu du CSR à copier dans l’interface OVH**
```bash
sudo cat /etc/ssl/private/badgeuse.dqvdcs.fr.csr
```
→ Copier **tout** le bloc (de `-----BEGIN CERTIFICATE REQUEST-----` à `-----END CERTIFICATE REQUEST-----`) et le coller dans la commande OVH pour obtenir le certificat.

**8. (Optionnel) Vérifier que le CSR correspond au bon domaine**
```bash
openssl req -in /etc/ssl/private/badgeuse.dqvdcs.fr.csr -noout -subject
```
→ Doit afficher une ligne contenant `CN = badgeuse.dqvdcs.fr` (ou similaire).

---

## Partie 3 : Après réception du certificat OVH (activation SSL)

Une fois que OVH t’a envoyé le fichier certificat (et éventuellement le CA-bundle) :

**1. Créer le certificat sur le serveur**
```bash
sudo nano /etc/ssl/certs/badgeuse.dqvdcs.fr.crt
```
→ Coller le contenu du certificat fourni par OVH (tout le bloc entre BEGIN et END CERTIFICATE), sauvegarder (Ctrl+O, Entrée, Ctrl+X).

**2. Si OVH a fourni un fichier chaîne intermédiaire (CA-bundle)**
```bash
sudo nano /etc/ssl/certs/badgeuse.dqvdcs.fr.ca-bundle
```
→ Coller le contenu du bundle, sauvegarder.

**3. Droits sur les fichiers**
```bash
sudo chmod 644 /etc/ssl/certs/badgeuse.dqvdcs.fr.crt
sudo chmod 600 /etc/ssl/private/badgeuse.dqvdcs.fr.key
```

**4. Configurer le serveur web**

- **Nginx** : dans le vhost qui sert `badgeuse.dqvdcs.fr`, ajouter (ou adapter) :
  - `ssl_certificate /etc/ssl/certs/badgeuse.dqvdcs.fr.crt;`
  - `ssl_certificate_key /etc/ssl/private/badgeuse.dqvdcs.fr.key;`
  - Si tu as un fichier bundle : `ssl_trusted_certificate /etc/ssl/certs/badgeuse.dqvdcs.fr.ca-bundle;`
- **Apache** : dans le vhost 443 pour `badgeuse.dqvdcs.fr` :
  - `SSLCertificateFile /etc/ssl/certs/badgeuse.dqvdcs.fr.crt`
  - `SSLCertificateKeyFile /etc/ssl/private/badgeuse.dqvdcs.fr.key`
  - Optionnel : `SSLCertificateChainFile /etc/ssl/certs/badgeuse.dqvdcs.fr.ca-bundle`

**5. Tester la config puis recharger**
```bash
# Si Nginx :
sudo nginx -t && sudo systemctl reload nginx
```
```bash
# Si Apache :
sudo apache2ctl configtest && sudo systemctl reload apache2
```

**6. Vérifier en ligne de commande**
```bash
openssl s_client -connect badgeuse.dqvdcs.fr:443 -servername badgeuse.dqvdcs.fr </dev/null 2>/dev/null | openssl x509 -noout -dates -subject
```

---

## Récap des fichiers

| Rôle        | Fichier sur le serveur |
|------------|-------------------------|
| Clé privée | `/etc/ssl/private/badgeuse.dqvdcs.fr.key` |
| CSR        | `/etc/ssl/private/badgeuse.dqvdcs.fr.csr` (à envoyer à OVH, pas à installer) |
| Certificat | `/etc/ssl/certs/badgeuse.dqvdcs.fr.crt` (après réception OVH) |
| Chaîne     | `/etc/ssl/certs/badgeuse.dqvdcs.fr.ca-bundle` (si fourni par OVH) |

Tu peux exécuter la Partie 1, noter les sorties (ou les coller ici), puis enchaîner avec la Partie 2. Dès que tu as le certificat OVH, on fait la Partie 3 en adaptant si besoin au vhost existant (nice2meetU / dqvdcs.fr).
