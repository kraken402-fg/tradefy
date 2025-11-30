const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { config } = require('../../config/platforms');

/**
 * Utilitaire de sécurité pour Tradefy
 */
class Security {
    constructor() {
        this.saltRounds = 12;
        this.jwtSecret = config.security.jwtSecret;
        this.sessionTimeout = config.security.sessionTimeout || 3600000; // 1 heure
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 900000; // 15 minutes
    }

    /**
     * Hasher un mot de passe
     */
    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, this.saltRounds);
        } catch (error) {
            console.error('Erreur lors du hashage du mot de passe:', error);
            throw new Error('Erreur lors du hashage du mot de passe');
        }
    }

    /**
     * Vérifier un mot de passe
     */
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            console.error('Erreur lors de la vérification du mot de passe:', error);
            return false;
        }
    }

    /**
     * Générer un token JWT
     */
    generateToken(payload, expiresIn = null) {
        try {
            const tokenPayload = {
                ...payload,
                iat: Math.floor(Date.now() / 1000),
                jti: crypto.randomUUID()
            };

            const options = {};
            if (expiresIn) {
                options.expiresIn = expiresIn;
            } else {
                options.expiresIn = config.security.jwtExpiresIn || '1h';
            }

            return jwt.sign(tokenPayload, this.jwtSecret, options);
        } catch (error) {
            console.error('Erreur lors de la génération du token:', error);
            throw new Error('Erreur lors de la génération du token');
        }
    }

    /**
     * Vérifier un token JWT
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
            return null;
        }
    }

    /**
     * Rafraîchir un token JWT
     */
    refreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret, { ignoreExpiration: true });
            
            // Supprimer les anciens claims
            delete decoded.iat;
            delete decoded.exp;
            delete decoded.jti;
            
            // Générer un nouveau token
            return this.generateToken(decoded, config.security.refreshExpiresIn || '7d');
        } catch (error) {
            console.error('Erreur lors du rafraîchissement du token:', error);
            return null;
        }
    }

    /**
     * Générer une clé aléatoire
     */
    generateRandomKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Générer un token de réinitialisation
     */
    generateResetToken() {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 heure
        
        return {
            token,
            expiresAt
        };
    }

    /**
     * Vérifier un token de réinitialisation
     */
    verifyResetToken(token, expiresAt) {
        try {
            if (!token || !expiresAt) {
                return false;
            }

            const now = new Date();
            const expiration = new Date(expiresAt);
            
            if (now > expiration) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de la vérification du token de réinitialisation:', error);
            return false;
        }
    }

    /**
     * Générer une signature HMAC
     */
    generateSignature(data, secret) {
        try {
            const payload = JSON.stringify(data);
            return crypto.createHmac('sha256', secret).update(payload).digest('hex');
        } catch (error) {
            console.error('Erreur lors de la génération de la signature:', error);
            throw new Error('Erreur lors de la génération de la signature');
        }
    }

    /**
     * Vérifier une signature HMAC
     */
    verifySignature(data, signature, secret) {
        try {
            const expectedSignature = this.generateSignature(data, secret);
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            console.error('Erreur lors de la vérification de la signature:', error);
            return false;
        }
    }

    /**
     * Nettoyer et valider les entrées
     */
    sanitizeInput(input, type = 'string') {
        try {
            if (!input) return '';

            switch (type) {
                case 'string':
                    return this.sanitizeString(input);
                case 'email':
                    return this.sanitizeEmail(input);
                case 'number':
                    return this.sanitizeNumber(input);
                case 'phone':
                    return this.sanitizePhone(input);
                case 'url':
                    return this.sanitizeUrl(input);
                case 'html':
                    return this.sanitizeHtml(input);
                default:
                    return this.sanitizeString(input);
            }
        } catch (error) {
            console.error('Erreur lors du nettoyage de l\'entrée:', error);
            return '';
        }
    }

    /**
     * Nettoyer une chaîne de caractères
     */
    sanitizeString(input) {
        if (typeof input !== 'string') {
            return String(input);
        }

        return input
            .trim()
            .replace(/[<>]/g, '') // Supprimer les chevrons
            .replace(/javascript:/gi, '') // Supprimer les protocoles javascript
            .replace(/on\w+=/gi, '') // Supprimer les gestionnaires d'événements
            .substring(0, 1000); // Limiter la longueur
    }

    /**
     * Nettoyer un email
     */
    sanitizeEmail(input) {
        if (typeof input !== 'string') {
            return '';
        }

        const email = input.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        return emailRegex.test(email) ? email : '';
    }

    /**
     * Nettoyer un nombre
     */
    sanitizeNumber(input) {
        const num = parseFloat(input);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Nettoyer un numéro de téléphone
     */
    sanitizePhone(input) {
        if (typeof input !== 'string') {
            return '';
        }

        return input
            .replace(/[^\d+]/g, '') // Garder seulement les chiffres et +
            .substring(0, 20); // Limiter la longueur
    }

    /**
     * Nettoyer une URL
     */
    sanitizeUrl(input) {
        if (typeof input !== 'string') {
            return '';
        }

        try {
            const url = new URL(input);
            return url.toString();
        } catch (error) {
            return '';
        }
    }

    /**
     * Nettoyer du HTML
     */
    sanitizeHtml(input) {
        if (typeof input !== 'string') {
            return '';
        }

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Supprimer les scripts
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Supprimer les iframes
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Supprimer les objets
            .replace(/<embed\b[^>]*>/gi, '') // Supprimer les embeds
            .replace(/on\w+="[^"]*"/gi, '') // Supprimer les gestionnaires d'événements
            .replace(/javascript:/gi, '') // Supprimer les protocoles javascript
            .replace(/vbscript:/gi, '') // Supprimer les protocoles vbscript
            .replace(/data:/gi, '') // Supprimer les protocoles data
            .substring(0, 5000); // Limiter la longueur
    }

    /**
     * Valider la force d'un mot de passe
     */
    validatePasswordStrength(password) {
        try {
            const checks = {
                length: password.length >= 8,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                numbers: /\d/.test(password),
                specialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                noCommonPatterns: !/(.)\1{2,}/.test(password), // Pas 3+ caractères identiques
                noSequentialChars: !/(abc|123|qwe)/i.test(password)
            };

            const score = Object.values(checks).filter(Boolean).length;
            let strength = 'weak';
            
            if (score >= 6) strength = 'strong';
            else if (score >= 4) strength = 'medium';

            return {
                strength,
                score,
                checks,
                suggestions: this.getPasswordSuggestions(checks)
            };
        } catch (error) {
            console.error('Erreur lors de la validation du mot de passe:', error);
            return { strength: 'weak', score: 0, checks: {}, suggestions: [] };
        }
    }

    /**
     * Obtenir des suggestions pour améliorer le mot de passe
     */
    getPasswordSuggestions(checks) {
        const suggestions = [];

        if (!checks.length) suggestions.push('Utilisez au moins 8 caractères');
        if (!checks.uppercase) suggestions.push('Ajoutez une majuscule');
        if (!checks.lowercase) suggestions.push('Ajoutez une minuscule');
        if (!checks.numbers) suggestions.push('Ajoutez un chiffre');
        if (!checks.specialChars) suggestions.push('Ajoutez un caractère spécial');
        if (!checks.noCommonPatterns) suggestions.push('Évitez les caractères répétés');
        if (!checks.noSequentialChars) suggestions.push('Évitez les séquences communes');

        return suggestions;
    }

    /**
     * Configurer les middleware de sécurité Express
     */
    configureSecurityMiddleware(app) {
        // Helmet pour les en-têtes de sécurité
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    scriptSrc: ["'self'"],
                    connectSrc: ["'self'", "https://api.moneroo.io"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limiter chaque IP à 100 requêtes
            message: {
                error: 'Trop de requêtes, veuillez réessayer plus tard'
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        app.use(limiter);

        // Rate limiting plus strict pour l'authentification
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // Limiter à 5 tentatives de connexion
            message: {
                error: 'Trop de tentatives de connexion, veuillez réessayer plus tard'
            },
            skipSuccessfulRequests: true
        });

        app.use('/api/auth/login', authLimiter);
        app.use('/api/auth/register', authLimiter);

        return { limiter, authLimiter };
    }

    /**
     * Middleware d'authentification JWT
     */
    authenticateToken(req, res, next) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

            if (!token) {
                return res.status(401).json({
                    error: 'Token d\'authentification manquant'
                });
            }

            const decoded = this.verifyToken(token);
            if (!decoded) {
                return res.status(403).json({
                    error: 'Token invalide ou expiré'
                });
            }

            req.user = decoded;
            next();
        } catch (error) {
            console.error('Erreur lors de l\'authentification:', error);
            return res.status(500).json({
                error: 'Erreur lors de l\'authentification'
            });
        }
    }

    /**
     * Middleware de vérification des rôles
     */
    requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentification requise'
                });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    error: 'Permissions insuffisantes'
                });
            }

            next();
        };
    }

    /**
     * Middleware de vérification du propriétaire
     */
    requireOwnership(resourceIdField = 'id') {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentification requise'
                });
            }

            // Les admins peuvent tout faire
            if (req.user.role === 'admin') {
                return next();
            }

            // Vérifier si l'utilisateur est le propriétaire
            const resourceUserId = req.params[resourceIdField] || req.body[resourceIdField];
            
            if (req.user.userId !== resourceUserId) {
                return res.status(403).json({
                    error: 'Accès non autorisé'
                });
            }

            next();
        };
    }

    /**
     * Middleware de validation CORS
     */
    configureCors(app) {
        const corsOptions = {
            origin: function (origin, callback) {
                const allowedOrigins = config.cors.origins || ['http://localhost:3000'];
                
                // Autoriser les requêtes sans origin (mobile, curl, etc.)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Non autorisé par CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        };

        return corsOptions;
    }

    /**
     * Chiffrer des données sensibles
     */
    encrypt(data, key) {
        try {
            const algorithm = 'aes-256-gcm';
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(algorithm, key);
            
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex')
            };
        } catch (error) {
            console.error('Erreur lors du chiffrement:', error);
            throw new Error('Erreur lors du chiffrement');
        }
    }

    /**
     * Déchiffrer des données sensibles
     */
    decrypt(encryptedData, key) {
        try {
            const algorithm = 'aes-256-gcm';
            const decipher = crypto.createDecipher(algorithm, key);
            
            decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Erreur lors du déchiffrement:', error);
            throw new Error('Erreur lors du déchiffrement');
        }
    }

    /**
     * Générer un hash pour les mots de passe oubliés
     */
    generatePasswordResetHash(email) {
        const timestamp = Date.now().toString();
        const randomString = crypto.randomBytes(32).toString('hex');
        
        const payload = {
            email,
            timestamp,
            random: randomString
        };
        
        return this.generateSignature(payload, this.jwtSecret);
    }

    /**
     * Vérifier un hash de réinitialisation
     */
    verifyPasswordResetHash(hash, email) {
        try {
            // Extraire le payload du hash
            const parts = hash.split('.');
            if (parts.length !== 3) {
                return false;
            }
            
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            
            // Vérifier l'email
            if (payload.email !== email) {
                return false;
            }
            
            // Vérifier le timestamp (24h max)
            const timestamp = parseInt(payload.timestamp);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 heures
            
            if (now - timestamp > maxAge) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la vérification du hash de réinitialisation:', error);
            return false;
        }
    }

    /**
     * Journaliser une tentative de connexion
     */
    logLoginAttempt(email, ip, userAgent, success = false) {
        try {
            const logEntry = {
                email,
                ip,
                userAgent,
                success,
                timestamp: new Date()
            };
            
            console.log(`Login attempt: ${email} from ${ip} - ${success ? 'SUCCESS' : 'FAILED'}`);
            
            // En production, stocker dans la base de données
            // await this.db.query('INSERT INTO login_logs (...) VALUES (...)', logEntry);
            
        } catch (error) {
            console.error('Erreur lors de la journalisation de la tentative de connexion:', error);
        }
    }

    /**
     * Détecter les activités suspectes
     */
    detectSuspiciousActivity(email, ip, userAgent) {
        try {
            // Logique de détection simple
            const suspiciousPatterns = [
                /bot/i.test(userAgent), // Bots
                /curl/i.test(userAgent), // curl/wget
                ip.startsWith('127.') || ip.startsWith('192.168.'), // IPs locales
                email.includes('test') || email.includes('demo') // Emails de test
            ];
            
            return suspiciousPatterns.some(pattern => pattern);
        } catch (error) {
            console.error('Erreur lors de la détection d\'activité suspecte:', error);
            return false;
        }
    }

    /**
     * Obtenir des informations sur l'IP
     */
    getIpInfo(ip) {
        try {
            // Informations basiques sur l'IP
            return {
                ip,
                isPrivate: /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/.test(ip),
                isLocalhost: ip === '127.0.0.1' || ip === '::1',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Erreur lors de l\'obtention des informations IP:', error);
            return null;
        }
    }
}

module.exports = Security;
