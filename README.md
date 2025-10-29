# Tradefy

Projet marketplace minimal « Tradefy » (frontend: HTML5, Bootstrap5, CSS3, vanilla JS — backend: Node.js, Express, Mongoose). Ce dossier contient le frontend et le backend prêts à être configurés et déployés.

CONTENU
- `frontend/` — pages HTML + assets (CSS/JS/images)
- `backend/` — serveur Express, routes, modèles Mongoose, scripts utilitaires

CONFIGURATION RAPIDE
1. Copier `.env.template` vers `.env` dans `backend/` et remplir les clés (MONGO_URI, MONEROO_API_KEY, MONEROO_WEBHOOK_SECRET, JWT_SECRET, etc.).
2. Installer les dépendances :

```powershell
cd backend
npm install
```

3. Lancer le serveur en local :

```powershell
node server.js
```

4. Pour seeds/sample data :

```powershell
node scripts/seed.js
```

WEBHOOKS ET TESTS LOCAUX
- Utiliser `ngrok http 5000` pour exposer votre serveur et enregistrer l'URL dans Moneroo dashboard.
- Mettre `MONEROO_WEBHOOK_SECRET` et `MONEROO_API_KEY` dans `.env`.

DEPLOIEMENT
- Voir `deploy-vercel.md` pour instructions Vercel / Render.

SECURITE
- Remplacez les placeholders dans `backend/lib/liaison.js` et `.env` avant mise en production.
- Les webhooks Moneroo doivent être vérifiés via `MONEROO_WEBHOOK_SECRET`.
