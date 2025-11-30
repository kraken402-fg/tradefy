const { config, isProduction } = require('../config/platforms');

class Security {
    /**
     * Valider un token JWT
     */
    static async validateToken(token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, config.security.jwtSecret);
            
            if (!decoded.user_id || !decoded.email) {
                throw new Error('Invalid token structure');
            }
            
            return decoded;
        } catch (error) {
            throw new Error('Token validation failed: ' + error.message);
        }
    }

    /**
     * Générer un token de réinitialisation
     */
    static generateResetToken() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Hasher un token
     */
    static hashToken(token) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Vérifier si un email est valide
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Vérifier si un mot de passe est robuste
     */
    static isStrongPassword(password) {
        // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    }

    /**
     * Nettoyer les entrées utilisateur
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Supprimer les caractères HTML dangereux
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Valider un numéro de téléphone
     */
    static isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    /**
     * Générer une clé API sécurisée
     */
    static generateApiKey() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Vérifier une signature de webhook
     */
    static verifyWebhookSignature(payload, signature, secret) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Limiter la taille des fichiers
     */
    static validateFileSize(size, maxSize) {
        return size <= maxSize;
    }

    /**
     * Valider le type MIME d'un fichier
     */
    static validateMimeType(mimeType, allowedTypes) {
        return allowedTypes.includes(mimeType);
    }

    /**
     * Générer un nom de fichier sécurisé
     */
    static generateSecureFilename(originalName) {
        const crypto = require('crypto');
        const ext = originalName.split('.').pop();
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}_${random}.${ext}`;
    }

    /**
     * Masquer les informations sensibles
     */
    static maskSensitiveData(data, fields = ['password', 'token', 'secret', 'key']) {
        const masked = { ...data };
        
        fields.forEach(field => {
            if (masked[field]) {
                const value = masked[field].toString();
                if (value.length > 4) {
                    masked[field] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
                } else {
                    masked[field] = '*'.repeat(value.length);
                }
            }
        });
        
        return masked;
    }

    /**
     * Valider les montants monétaires
     */
    static isValidAmount(amount) {
        const numAmount = parseFloat(amount);
        return !isNaN(numAmount) && numAmount > 0 && numAmount <= 999999.99;
    }

    /**
     * Générer un ID de transaction unique
     */
    static generateTransactionId() {
        const crypto = require('crypto');
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(8).toString('hex').toUpperCase();
        return `TRF_${timestamp}_${random}`;
    }

    /**
     * Vérifier si une URL est sécurisée
     */
    static isSecureUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:' || urlObj.hostname === 'localhost';
        } catch {
            return false;
        }
    }

    /**
     * Limiter les tentatives de connexion
     */
    static createRateLimiter(maxAttempts = 5, windowMs = 900000) { // 15 minutes
        const attempts = new Map();
        
        return (key) => {
            const now = Date.now();
            const userAttempts = attempts.get(key) || { count: 0, resetTime: now + windowMs };
            
            if (now > userAttempts.resetTime) {
                userAttempts.count = 0;
                userAttempts.resetTime = now + windowMs;
            }
            
            if (userAttempts.count >= maxAttempts) {
                return {
                    allowed: false,
                    remainingTime: userAttempts.resetTime - now
                };
            }
            
            userAttempts.count++;
            attempts.set(key, userAttempts);
            
            return {
                allowed: true,
                remainingAttempts: maxAttempts - userAttempts.count
            };
        };
    }

    /**
     * Journaliser les événements de sécurité
     */
    static logSecurityEvent(event, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            severity: this.getEventSeverity(event)
        };
        
        console.log('[SECURITY]', JSON.stringify(logEntry));
        
        // En production, envoyer à un service de monitoring
        if (isProduction()) {
            // TODO: Intégrer avec Sentry ou un autre service
        }
    }

    /**
     * Obtenir le niveau de sévérité d'un événement
     */
    static getEventSeverity(event) {
        const severityMap = {
            'LOGIN_SUCCESS': 'info',
            'LOGIN_FAILED': 'warning',
            'LOGIN_BLOCKED': 'critical',
            'PASSWORD_CHANGE': 'info',
            'ACCOUNT_DISABLED': 'warning',
            'SUSPICIOUS_ACTIVITY': 'critical',
            'WEBHOOK_RECEIVED': 'info',
            'WEBHOOK_FAILED': 'error'
        };
        
        return severityMap[event] || 'info';
    }

    /**
     * Valider une adresse IP
     */
    static isValidIP(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    /**
     * Obtenir l'adresse IP d'une requête
     */
    static getClientIP(req) {
        return req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               req.ip || 
               'unknown';
    }

    /**
     * Détecter les requêtes suspectes
     */
    static isSuspiciousRequest(req) {
        const suspiciousPatterns = [
            /\.\.\//,  // Path traversal
            /<script/i, // XSS attempt
            /union.*select/i, // SQL injection attempt
            /javascript:/i, // JavaScript protocol
            /data:/i // Data protocol
        ];
        
        const url = req.url || '';
        const userAgent = req.headers['user-agent'] || '';
        
        return suspiciousPatterns.some(pattern => 
            pattern.test(url) || pattern.test(userAgent)
        );
    }

    /**
     * Créer un middleware de sécurité
     */
    static securityMiddleware() {
        return (req, res, next) => {
            // Détecter les requêtes suspectes
            if (this.isSuspiciousRequest(req)) {
                this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
                    ip: this.getClientIP(req),
                    url: req.url,
                    userAgent: req.headers['user-agent']
                });
                
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Requête invalide',
                        code: 'SUSPICIOUS_REQUEST'
                    },
                    timestamp: Date.now()
                });
            }
            
            // Ajouter des en-têtes de sécurité
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            
            next();
        };
    }
}

module.exports = Security;
