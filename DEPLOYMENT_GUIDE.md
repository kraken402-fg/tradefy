# 🚀 TRAdefy v3 - Guide de Déploiement et Configuration

## 📋 Vue d'ensemble

Ce guide vous explique comment configurer et déployer votre plateforme Tradefy avec les URLs des différentes plateformes.

## 🔗 Plateformes Configurées

### 1. **Vercel** (Frontend)
- **URL**: `https://tradefy-eight.vercel.app` (à remplacer par votre URL)
- **Rôle**: Hébergement du site web statique
- **Configuration**: Variables d'environnement dans Vercel Dashboard

### 2. **InfinityFree** (Backend)
- **URL**: `https://tradefy-backend.infinityfreeapp.com` (à remplacer par votre URL)
- **Rôle**: Serveur API Node.js
- **Configuration**: Fichier `.env` sur le serveur

### 3. **Supabase** (Base de données)
- **URL**: `https://your-project-ref.supabase.co` (à remplacer)
- **Rôle**: Base de données PostgreSQL et stockage de fichiers
- **Configuration**: Clés API et URL du projet Supabase

### 4. **Moneroo** (Paiement)
- **URL**: `https://api.moneroo.io/v1`
- **Rôle**: Traitement des paiements mobile money
- **Configuration**: Clés API Moneroo

## 🚀 Étapes de Configuration

### Étape 1: Configurer les URLs dans le fichier de configuration

1. Copiez `backend/.env.platforms` en `backend/.env`
2. Modifiez les valeurs suivantes:

```bash
# Vercel (Frontend)
FRONTEND_URL=https://votre-url-vercel.vercel.app

# InfinityFree (Backend)  
BACKEND_URL=https://votre-url-infinityfree.infinityfreeapp.com

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=votre-cle-anon
SUPABASE_SECRET=votre-cle-service-role

# Moneroo
MONEROO_API_KEY=votre-cle-api-moneroo
MONEROO_SECRET_KEY=votre-cle-secret-moneroo
```

### Étape 2: Configurer la base de données

1. Créez un projet Supabase
2. Exécutez le script SQL `backend/database/schema.sql`
3. Récupérez vos clés Supabase et ajoutez-les au `.env`

### Étape 3: Configurer Moneroo

1. Créez un compte Moneroo
2. Obtenez vos clés API
3. Configurez les webhooks vers votre backend InfinityFree
4. Ajoutez les clés au `.env`

### Étape 4: Déployer le Backend sur InfinityFree

1. Uploadez les fichiers du backend sur InfinityFree
2. Configurez les variables d'environnement
3. Installez les dépendances avec `npm install`
4. Démarrez le serveur avec `npm start`

### Étape 5: Déployer le Frontend sur Vercel

1. Connectez votre repository Git à Vercel
2. Configurez les variables d'environnement dans Vercel
3. Déployez automatiquement

## 🔧 Fichiers de Configuration

### `backend/.env` (Variables d'environnement)
```bash
# URLs des plateformes
FRONTEND_URL=https://tradefy-eight.vercel.app
BACKEND_URL=https://tradefy-backend.infinityfreeapp.com

# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-anon-key-here
SUPABASE_SECRET=your-supabase-service-role-key-here

# Moneroo
MONEROO_API_KEY=your-moneroo-api-key-here
MONEROO_SECRET_KEY=your-moneroo-secret-key-here

# Sécurité
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
```

### `backend/config/platforms.js` (Configuration centralisée)
Ce fichier contient toute la configuration des plateformes et est automatiquement chargé par le backend.

## 🔐 Sécurité

### Tokens JWT
- Clé secrète configurable via `JWT_SECRET`
- Expiration par défaut: 24 heures
- Rafraîchissement automatique des tokens

### CORS
- Origines autorisées configurées dans `ALLOWED_ORIGINS`
- Protection contre les requêtes cross-origin

### Rate Limiting
- 100 requêtes par 15 minutes par IP
- Protection contre les attaques par force brute

### Validation des entrées
- Nettoyage automatique des entrées utilisateur
- Validation des emails et mots de passe
- Protection XSS et CSRF

## 📊 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │  InfinityFree  │    │   Supabase      │
│   (Frontend)    │◄──►│   (Backend)    │◄──►│  (Database)     │
│                 │    │                 │    │                 │
│ • Pages HTML    │    │ • API REST      │    │ • PostgreSQL    │
│ • JavaScript    │    │ • Authentification│ │ • Storage       │
│ • CSS           │    │ • Validation    │    │ • Real-time     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Moneroo     │
                       │   (Paiement)    │
                       │                 │
                       │ • Mobile Money  │
                       │ • Webhooks      │
                       │ • Transactions  │
                       └─────────────────┘
```

## 🌐 Endpoints API

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `POST /api/auth/refresh` - Rafraîchir token
- `GET /api/auth/profile` - Profil utilisateur

### Produits
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit
- `PUT /api/products/{id}` - Mettre à jour un produit
- `DELETE /api/products/{id}` - Supprimer un produit

### Commandes
- `GET /api/orders` - Liste des commandes
- `POST /api/orders` - Créer une commande
- `PUT /api/orders/{id}/status` - Mettre à jour statut

### Paiements
- `POST /api/payments/initialize` - Initialiser paiement
- `GET /api/payments/{id}/status` - Vérifier statut
- `POST /api/webhooks/moneroo` - Webhook Moneroo

## 🔄 Webhooks

### Configuration Moneroo
Configurez l'URL de webhook vers:
```
https://votre-backend-infinityfree.infinityfreeapp.com/api/webhooks/moneroo
```

### Événements gérés
- `payment.completed` - Paiement réussi
- `payment.failed` - Paiement échoué
- `payment.cancelled` - Paiement annulé

## 📱 Fonctionnalités Sécurisées

### Frontend
- Validation en temps réel des formulaires
- Protection contre les attaques XSS
- Gestion sécurisée des tokens
- Redirections automatiques
- Session timeout

### Backend
- Validation des entrées serveur
- Rate limiting par IP
- Tokens JWT sécurisés
- Logs d'activité
- CORS configuré

## 🚀 Déploiement Rapide

### 1. Prérequis
- Comptes sur Vercel, InfinityFree, Supabase, Moneroo
- Node.js 16+ pour le développement local
- Git pour le versioning

### 2. Configuration (5 minutes)
```bash
# 1. Copier la configuration
cp backend/.env.platforms backend/.env

# 2. Modifier les URLs et clés
nano backend/.env

# 3. Installer les dépendances
cd backend && npm install

# 4. Démarrer en local
npm start
```

### 3. Déploiement Production
1. **Supabase**: Créer projet et exécuter schema.sql
2. **InfinityFree**: Uploader backend et configurer .env
3. **Vercel**: Connecter repository et déployer
4. **Moneroo**: Configurer webhooks vers InfinityFree

## 🧪 Tests

### Tests locaux
```bash
# Backend
cd backend
npm test

# Frontend (ouvrir dans navigateur)
open frontend/login-secure.html
```

### Tests de connexion
- Vérifier que le backend répond sur `/health`
- Tester l'inscription/connexion
- Vérifier les redirections
- Valider la sécurité

## 📞 Support

### Problèmes courants
1. **CORS erreur**: Vérifier `ALLOWED_ORIGINS` dans `.env`
2. **Token invalide**: Vérifier `JWT_SECRET` identique sur tous les serveurs
3. **Base de données**: Vérifier connexion Supabase
4. **Paiement**: Configurer webhooks Moneroo

### Logs et monitoring
- Logs backend: `logs/tradefy.log`
- Console browser pour le frontend
- Monitoring Supabase pour la base de données
- Dashboard Moneroo pour les paiements

## 🔄 Mises à jour

### Pour mettre à jour les URLs
1. Modifiez `backend/.env`
2. Redémarrez le backend InfinityFree
3. Redéployez le frontend Vercel

### Pour ajouter de nouvelles fonctionnalités
1. Ajoutez les endpoints dans `backend/controllers/`
2. Mettez à jour le frontend dans `frontend/assets/js/`
3. Testez localement avant déploiement

---

🎉 **Votre plateforme Tradefy est maintenant prête!**

Avec cette configuration, dès que vous ajouterez vos vraies URLs et clés dans le fichier `.env`, votre backend prendra vie et sera connecté à toutes vos plateformes.
