const { config } = require('../../config/platforms');

/**
 * Configuration des services externes
 */
class ExternalServices {
    constructor() {
        this.services = {
            supabase: {
                enabled: true,
                baseUrl: config.database.url,
                anonKey: config.database.key,
                serviceKey: config.database.secret,
                timeout: 30000,
                retries: 3
            },
            moneroo: {
                enabled: true,
                baseUrl: config.payment.baseUrl,
                apiKey: config.payment.apiKey,
                secretKey: config.payment.secretKey,
                webhookSecret: config.payment.webhookSecret,
                timeout: 15000,
                retries: 2
            },
            vercel: {
                enabled: true,
                baseUrl: config.frontend.url,
                timeout: 10000,
                retries: 2
            },
            infinityfree: {
                enabled: true,
                baseUrl: config.backend.url,
                timeout: 10000,
                retries: 2
            },
            email: {
                enabled: config.email.enabled,
                smtp: {
                    host: config.email.smtp.host,
                    port: config.email.smtp.port,
                    secure: config.email.smtp.secure,
                    auth: {
                        user: config.email.smtp.user,
                        pass: config.email.smtp.pass
                    }
                },
                from: config.email.from,
                support: config.email.support,
                timeout: 15000
            },
            analytics: {
                enabled: config.monitoring.analytics.enabled,
                trackingId: config.monitoring.analytics.trackingId,
                baseUrl: 'https://www.google-analytics.com'
            },
            cache: {
                enabled: config.cache.enabled,
                redis: {
                    host: config.cache.redis.host,
                    port: config.cache.redis.port,
                    password: config.cache.redis.password,
                    db: config.cache.redis.db,
                    timeout: 5000
                }
            },
            storage: {
                enabled: true,
                supabase: {
                    bucket: 'tradefy-assets',
                    baseUrl: `${config.database.url}/storage/v1`,
                    headers: {
                        'apikey': config.database.key,
                        'Authorization': `Bearer ${config.database.key}`
                    }
                }
            }
        };
    }

    /**
     * Obtenir la configuration d'un service
     */
    getServiceConfig(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Service "${serviceName}" non configuré`);
        }
        return service;
    }

    /**
     * Vérifier si un service est activé
     */
    isServiceEnabled(serviceName) {
        const service = this.services[serviceName];
        return service && service.enabled;
    }

    /**
     * Obtenir tous les services activés
     */
    getEnabledServices() {
        return Object.keys(this.services).filter(name => this.isServiceEnabled(name));
    }

    /**
     * Obtenir les services par catégorie
     */
    getServicesByCategory() {
        return {
            database: ['supabase'],
            payment: ['moneroo'],
            hosting: ['vercel', 'infinityfree'],
            communication: ['email'],
            monitoring: ['analytics'],
            caching: ['cache'],
            storage: ['storage']
        };
    }

    /**
     * Valider la configuration d'un service
     */
    validateServiceConfig(serviceName) {
        try {
            const service = this.getServiceConfig(serviceName);
            const validation = {
                valid: true,
                errors: [],
                warnings: []
            };

            switch (serviceName) {
                case 'supabase':
                    if (!service.baseUrl) validation.errors.push('URL Supabase manquante');
                    if (!service.anonKey) validation.errors.push('Clé anon Supabase manquante');
                    if (!service.serviceKey) validation.warnings.push('Clé service Supabase manquante (accès limité)');
                    break;

                case 'moneroo':
                    if (!service.baseUrl) validation.errors.push('URL Moneroo manquante');
                    if (!service.apiKey) validation.errors.push('Clé API Moneroo manquante');
                    if (!service.secretKey) validation.errors.push('Clé secrète Moneroo manquante');
                    break;

                case 'email':
                    if (service.enabled) {
                        if (!service.smtp.host) validation.errors.push('Hôte SMTP manquant');
                        if (!service.smtp.auth.user) validation.errors.push('Utilisateur SMTP manquant');
                        if (!service.smtp.auth.pass) validation.errors.push('Mot de passe SMTP manquant');
                    }
                    break;

                case 'cache':
                    if (service.enabled) {
                        if (!service.redis.host) validation.errors.push('Hôte Redis manquant');
                        if (!service.redis.port) validation.errors.push('Port Redis manquant');
                    }
                    break;

                default:
                    // Validation générique
                    if (!service.baseUrl) validation.warnings.push(`URL ${serviceName} manquante`);
                    break;
            }

            validation.valid = validation.errors.length === 0;
            return validation;

        } catch (error) {
            return {
                valid: false,
                errors: [error.message],
                warnings: []
            };
        }
    }

    /**
     * Valider toutes les configurations de services
     */
    validateAllServices() {
        const results = {};
        let totalErrors = 0;
        let totalWarnings = 0;

        for (const serviceName of Object.keys(this.services)) {
            const validation = this.validateServiceConfig(serviceName);
            results[serviceName] = validation;
            totalErrors += validation.errors.length;
            totalWarnings += validation.warnings.length;
        }

        return {
            valid: totalErrors === 0,
            totalErrors,
            totalWarnings,
            results
        };
    }

    /**
     * Obtenir les URLs de base des services
     */
    getBaseUrls() {
        const urls = {};
        
        for (const [name, service] of Object.entries(this.services)) {
            if (service.baseUrl) {
                urls[name] = service.baseUrl;
            }
        }

        return urls;
    }

    /**
     * Obtenir les clés d'API (masquées)
     */
    getApiKeys(masked = true) {
        const keys = {};

        for (const [name, service] of Object.entries(this.services)) {
            const serviceKeys = {};

            // Clés Supabase
            if (service.anonKey) {
                serviceKeys.anonKey = this.maskKey(service.anonKey, masked);
            }
            if (service.serviceKey) {
                serviceKeys.serviceKey = this.maskKey(service.serviceKey, masked);
            }

            // Clés Moneroo
            if (service.apiKey) {
                serviceKeys.apiKey = this.maskKey(service.apiKey, masked);
            }
            if (service.secretKey) {
                serviceKeys.secretKey = this.maskKey(service.secretKey, masked);
            }

            // Clés SMTP
            if (service.smtp && service.smtp.auth) {
                if (service.smtp.auth.user) {
                    serviceKeys.smtpUser = service.smtp.auth.user;
                }
                if (service.smtp.auth.pass) {
                    serviceKeys.smtpPass = this.maskKey(service.smtp.auth.pass, masked);
                }
            }

            if (Object.keys(serviceKeys).length > 0) {
                keys[name] = serviceKeys;
            }
        }

        return keys;
    }

    /**
     * Masquer une clé pour l'affichage
     */
    maskKey(key, masked = true) {
        if (!masked || !key) return key;
        
        if (key.length <= 8) {
            return '*'.repeat(key.length);
        }

        return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
    }

    /**
     * Obtenir la configuration de timeout
     */
    getTimeouts() {
        const timeouts = {};

        for (const [name, service] of Object.entries(this.services)) {
            if (service.timeout) {
                timeouts[name] = service.timeout;
            }
        }

        return timeouts;
    }

    /**
     * Obtenir la configuration de retry
     */
    getRetries() {
        const retries = {};

        for (const [name, service] of Object.entries(this.services)) {
            if (service.retries) {
                retries[name] = service.retries;
            }
        }

        return retries;
    }

    /**
     * Mettre à jour la configuration d'un service
     */
    updateServiceConfig(serviceName, updates) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Service "${serviceName}" non configuré`);
        }

        // Fusionner les mises à jour
        Object.assign(service, updates);

        // Valider la nouvelle configuration
        const validation = this.validateServiceConfig(serviceName);
        if (!validation.valid) {
            throw new Error(`Configuration invalide pour ${serviceName}: ${validation.errors.join(', ')}`);
        }

        return service;
    }

    /**
     * Activer/désactiver un service
     */
    toggleService(serviceName, enabled) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Service "${serviceName}" non configuré`);
        }

        service.enabled = enabled;
        return service;
    }

    /**
     * Obtenir les statistiques d'utilisation des services
     */
    getServiceStats() {
        const stats = {
            total: Object.keys(this.services).length,
            enabled: this.getEnabledServices().length,
            disabled: Object.keys(this.services).length - this.getEnabledServices().length,
            byCategory: {}
        };

        const categories = this.getServicesByCategory();
        for (const [category, services] of Object.entries(categories)) {
            stats.byCategory[category] = {
                total: services.length,
                enabled: services.filter(s => this.isServiceEnabled(s)).length,
                disabled: services.filter(s => !this.isServiceEnabled(s)).length
            };
        }

        return stats;
    }

    /**
     * Exporter la configuration (sans clés secrètes)
     */
    exportConfig(safe = true) {
        const exported = {};

        for (const [name, service] of Object.entries(this.services)) {
            exported[name] = {
                enabled: service.enabled,
                baseUrl: service.baseUrl,
                timeout: service.timeout,
                retries: service.retries
            };

            // Inclure les clés seulement si safe = false
            if (!safe) {
                exported[name].apiKeys = this.getApiKeys(false)[name];
            }
        }

        return exported;
    }

    /**
     * Importer une configuration
     */
    importConfig(config) {
        for (const [name, serviceConfig] of Object.entries(config)) {
            if (this.services[name]) {
                // Mettre à jour seulement les champs non sensibles
                const allowedFields = ['enabled', 'baseUrl', 'timeout', 'retries'];
                const updates = {};

                for (const field of allowedFields) {
                    if (serviceConfig[field] !== undefined) {
                        updates[field] = serviceConfig[field];
                    }
                }

                this.updateServiceConfig(name, updates);
            }
        }
    }

    /**
     * Afficher le résumé des services
     */
    printServicesSummary() {
        console.log('🌐 Résumé des services externes:');
        console.log('='.repeat(50));

        const stats = this.getServiceStats();
        console.log(`📊 Total: ${stats.total} services`);
        console.log(`✅ Activés: ${stats.enabled}`);
        console.log(`❌ Désactivés: ${stats.disabled}\n`);

        const categories = this.getServicesByCategory();
        for (const [category, services] of Object.entries(categories)) {
            console.log(`📂 ${category.toUpperCase()}:`);
            services.forEach(service => {
                const status = this.isServiceEnabled(service) ? '✅' : '❌';
                const config = this.getServiceConfig(service);
                const url = config.baseUrl ? ` (${config.baseUrl})` : '';
                console.log(`  ${status} ${service}${url}`);
            });
            console.log('');
        }

        const validation = this.validateAllServices();
        if (!validation.valid) {
            console.log('⚠️  Erreurs de configuration:');
            for (const [service, result] of Object.entries(validation.results)) {
                if (!result.valid) {
                    console.log(`  ❌ ${service}: ${result.errors.join(', ')}`);
                }
            }
        }
    }
}

// Créer une instance globale
const externalServices = new ExternalServices();

module.exports = ExternalServices;
module.exports.default = externalServices;
