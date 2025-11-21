# Connexion sécurisée entre Windows (Node.js) et PostgreSQL sur Linux via SSH

Ce projet doit rester fidèle au cahier des charges : le serveur Node.js tourne sous Windows tandis que la base PostgreSQL/MySQL est hébergée dans une VM Linux isolée. La solution ci‑dessous repose sur un tunnel SSH, ce qui évite d'exposer la base au réseau tout en gardant une expérience de développement fluide.

## 1. Préparer la VM Linux (Ubuntu)

1. **Installer et activer SSH**
   ```bash
   sudo apt update
   sudo apt install -y openssh-server
   sudo systemctl enable ssh
   sudo systemctl start ssh
   sudo systemctl status ssh   # Vérification
   ```
2. **Installer PostgreSQL (ou MySQL)**
   ```bash
   sudo apt install -y postgresql
   ```
3. **Limiter l'écoute réseau de PostgreSQL à `localhost`** pour maintenir l'isolation :
   ```bash
   sudo nano /etc/postgresql/*/main/postgresql.conf
   # s'assurer que :
   listen_addresses = 'localhost'
   ```
4. Créer la base et l'utilisateur utilisés par l'application :
   ```bash
   sudo -u postgres psql
   CREATE DATABASE transport_manager;
   CREATE USER transport_app WITH ENCRYPTED PASSWORD 'motdepasseFort';
   GRANT ALL PRIVILEGES ON DATABASE transport_manager TO transport_app;
   \q
   ```

## 2. Configurer VirtualBox (ou l'hyperviseur)

1. Réseau de la VM en mode **NAT** pour rester isolé.
2. Ajouter une règle de redirection de ports dans la configuration réseau de la VM :

| Nom | Protocole | IP hôte    | Port hôte | IP invité | Port invité |
|-----|-----------|------------|-----------|-----------|-------------|
| SSH | TCP       | 127.0.0.1  | 2222      | 10.0.2.15 | 22          |

L'IP invitée `10.0.2.15` est celle utilisée par défaut en NAT (à ajuster si nécessaire).

## 3. Créer le tunnel SSH depuis Windows

Dans PowerShell (Windows 10/11 incluent déjà `ssh.exe`) :

```powershell
ssh -L 5432:localhost:5432 -p 2222 user@127.0.0.1
```

- `-L 5432:localhost:5432` : redirige le port local 5432 vers le port 5432 de la VM.
- `-p 2222` : port exposé par la règle NAT.
- `user` : utilisateur Linux.

Optionnel : ajouter `-N` (pas de commande distante) et `-f` (mode background) une fois testé.

Tant que la session SSH reste ouverte, toute connexion à `localhost:5432` côté Windows traverse automatiquement le tunnel chiffré vers PostgreSQL dans la VM.

## 4. Configurer l'application Node.js

Créer (ou adapter) un fichier `.env` à la racine du projet :

```env
DATABASE_URL=postgresql://transport_app:motdepasseFort@localhost:5432/transport_manager
SESSION_SECRET=remplacez-moi
PORT=5000
```

Ensuite :

```powershell
npm install          # Dépendances
npm run db:push      # Applique le schéma Drizzle dans la base distante
npm run dev          # Lance l'API + client
```

> 💡 Tant que le tunnel SSH est actif, `DATABASE_URL` pointe simplement vers `localhost`. Rien n’est exposé au réseau.

## 5. Vérifications utiles

1. **Tester la base depuis Windows** (facultatif mais rassurant) :
   ```powershell
   psql "postgresql://transport_app:motdepasseFort@localhost:5432/transport_manager"
   ```
2. **Surveiller les sessions** : `sudo ss -tunlp | grep 5432` côté Linux pour confirmer que seule l’adresse locale est utilisée.
3. **Redémarrage automatique du tunnel** :
   - Script PowerShell qui relance la commande `ssh -L ...`.
   - Ou utiliser un outil comme `autossh` si vous préférez le faire côté Linux.

## 6. Résumé architecture

```
Windows (Node.js + React) --ssh tunnel--> localhost:5432 (Linux VM)
                                     |--> PostgreSQL (écoute locale uniquement)
```

- La base reste totalement isolée.
- Le serveur Node voit la base comme si elle était locale, ce qui simplifie la configuration.
- Aucune ouverture de port supplémentaire n’est nécessaire.

Ces étapes respectent la contrainte « base sous Linux, serveur sous Windows » tout en garantissant la sécurité demandée dans le cahier des charges. Vous pouvez maintenant coder et tester l’application sans jamais exposer directement la base de données.
