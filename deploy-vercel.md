# Déploiement sur Vercel (et notes Render)

1. Pousser le repo sur GitHub.
2. Aller sur Vercel, "Import Project" → Connect GitHub → choisir le repo Tradefy.
3. Dans Settings > Environment Variables, ajouter les variables d'environnement depuis `backend/.env.template` :
   - MONGO_URI
   - MONEROO_API_KEY
   - MONEROO_WEBHOOK_SECRET
   - CLOUDFLARE_API_TOKEN
   - CLOUDFLARE_ACCOUNT_ID
   - SITE_URL (ex: https://your-site.vercel.app)
   - JWT_SECRET

4. Build & Run :
   - Vercel détectera les fichiers statiques. Pour exécuter le backend Node (Express), créez un `vercel.json` ou utilisez la configuration de Vercel pour lancer `node backend/server.js`.

5. Après le premier déploiement, obtenir la `SITE_URL` fournie par Vercel et aller dans le dashboard Moneroo pour enregistrer l'URL et générer `MONEROO_API_KEY`. Coller cette clé dans les variables d'environnement Vercel, puis redéployer.

Test local des webhooks

1. Démarrer le serveur local (port 5000) : `node backend/server.js`.
2. Lancer `ngrok http 5000`.
3. Dans Moneroo, définir l'URL du webhook sur `https://<ngrok-id>.ngrok.io/api/webhooks/moneroo` et définir la clé `MONEROO_WEBHOOK_SECRET`.

Notes Render

- Render accepte également des services Node; configurer le service pour exécuter `node backend/server.js` et définir les variables d'env équivalentes.
