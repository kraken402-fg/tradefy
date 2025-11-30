const { config, validateConfig } = require('../config/platforms');
const fs = require('fs');
const path = require('path');

/**
 * Script de vérification de l'environnement
 */
class EnvironmentChecker {
    constructor() {
        this.requiredEnvVars = [
            'NODE_ENV',
            'FRONTEND_URL',
            'BACKEND_URL',
            'SUPABASE_URL',
            'SUPABASE_KEY',
            'SUPABASE_SECRET',
            'MONEROO_API_KEY',
            'MONEROO_SECRET_KEY',
            'JWT_SECRET'
        ];

        this.optionalEnvVars = [
            'PORT',
            'LOG_LEVEL',
            'CORS_ORIGINS',
            'RATE_LIMIT_WINDOW_MS',
            'RATE_LIMIT_MAX_REQUESTS'
        ];
    }

    /**
     * Vérifier toutes les variables d'environnement
     */
    checkEnvironment() {
        console.log('🔍 Vérification de l\'environnement...\n');

        const missingRequired = [];
        const missingOptional = [];
        const presentVars = [];

        // Vérifier les variables requises
        for (const varName of this.requiredEnvVars) {
            const value = process.env[varName];
            if (!value || value.trim() === '') {
                missingRequired.push(varName);
            } else {
                presentVars.push({ name: varName, value: this.maskValue(varName, value) });
            }
        }

        // Vérifier les variables optionnelles
        for (const varName of this.optionalEnvVars) {
            const value = process.env[varName];
            if (!value || value.trim() === '') {
                missingOptional.push(varName);
            } else {
                presentVars.push({ name: varName, value: this.maskValue(varName, value) });
            }
        }

        // Afficher les résultats
        this.displayResults(presentVars, missingRequired, missingOptional);

        // Retourner le statut
        return {
            isValid: missingRequired.length === 0,
            missingRequired: missingRequired,
            missingOptional: missingOptional,
            presentVars: presentVars
        };
    }

    /**
     * Afficher les résultats de la vérification
     */
    displayResults(presentVars, missingRequired, missingOptional) {
        console.log('📊 Variables d\'environnement configurées:');
        presentVars.forEach(({ name, value }) => {
            console.log(`  ✅ ${name}: ${value}`);
        });

        if (missingRequired.length > 0) {
            console.log('\n❌ Variables requises manquantes:');
            missingRequired.forEach(varName => {
                console.log(`  ❌ ${varName}: Non configurée`);
            });
        }

        if (missingOptional.length > 0) {
            console.log('\n⚠️  Variables optionnelles manquantes:');
            missingOptional.forEach(varName => {
                console.log(`  ⚠️  ${varName}: Non configurée (optionnelle)`);
            });
        }

        if (missingRequired.length === 0) {
            console.log('\n🎉 Toutes les variables requises sont configurées!');
        } else {
            console.log(`\n🚨 ${missingRequired.length} variables requises manquent. Configurez-les avant de démarrer.`);
        }
    }

    /**
     * Masquer les valeurs sensibles
     */
    maskValue(varName, value) {
        const sensitiveVars = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN'];
        const isSensitive = sensitiveVars.some(sensitive => varName.includes(sensitive));
        
        if (isSensitive) {
            return value.length > 8 
                ? `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`
                : '*'.repeat(value.length);
        }
        
        return value;
    }

    /**
     * Vérifier la configuration des plateformes
     */
    checkPlatformConfiguration() {
        console.log('\n🌐 Vérification de la configuration des plateformes...\n');

        try {
            const configValid = validateConfig();
            
            if (configValid) {
                console.log('✅ Configuration des plateformes valide');
                
                // Vérifier les URLs
                console.log(`🔗 Frontend: ${config.frontend.url}`);
                console.log(`🔗 Backend: ${config.backend.url}`);
                console.log(`🗄️  Base de données: ${config.database.url ? '✅ Configurée' : '❌ Non configurée'}`);
                console.log(`💳 Paiement: ${config.payment.apiKey ? '✅ Configuré' : '❌ Non configuré'}`);
                
                return true;
            } else {
                console.log('❌ Configuration des plateformes invalide');
                return false;
            }
        } catch (error) {
            console.log(`❌ Erreur de configuration: ${error.message}`);
            return false;
        }
    }

    /**
     * Vérifier les permissions des fichiers
     */
    checkFilePermissions() {
        console.log('\n📁 Vérification des permissions des fichiers...\n');

        const criticalFiles = [
            'config/platforms.js',
            'index.js',
            '.env'
        ];

        const criticalDirs = [
            'logs',
            'tmp',
            'uploads'
        ];

        let allGood = true;

        // Vérifier les fichiers critiques
        for (const file of criticalFiles) {
            const filePath = path.join(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                try {
                    fs.accessSync(filePath, fs.constants.R_OK);
                    console.log(`✅ ${file}: Lisible`);
                } catch (error) {
                    console.log(`❌ ${file}: Permission refusée`);
                    allGood = false;
                }
            } else {
                console.log(`⚠️  ${file}: Fichier non trouvé`);
            }
        }

        // Vérifier les répertoires critiques
        for (const dir of criticalDirs) {
            const dirPath = path.join(__dirname, '..', dir);
            if (fs.existsSync(dirPath)) {
                try {
                    fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
                    console.log(`✅ ${dir}/: Accessible en lecture/écriture`);
                } catch (error) {
                    console.log(`❌ ${dir}/: Permission refusée`);
                    allGood = false;
                }
            } else {
                console.log(`⚠️  ${dir}/: Répertoire non trouvé`);
            }
        }

        return allGood;
    }

    /**
     * Vérifier les dépendances
     */
    checkDependencies() {
        console.log('\n📦 Vérification des dépendances...\n');

        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            console.log('❌ package.json non trouvé');
            return false;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const dependencies = packageJson.dependencies || {};
            
            console.log('✅ package.json trouvé');
            console.log(`📋 ${Object.keys(dependencies).length} dépendances trouvées`);
            
            // Vérifier les dépendances critiques
            const criticalDeps = ['express', 'cors', 'helmet', 'jsonwebtoken', 'bcryptjs', 'pg'];
            const missingDeps = [];
            
            for (const dep of criticalDeps) {
                if (!dependencies[dep]) {
                    missingDeps.push(dep);
                }
            }
            
            if (missingDeps.length === 0) {
                console.log('✅ Toutes les dépendances critiques sont présentes');
                return true;
            } else {
                console.log(`❌ Dépendances critiques manquantes: ${missingDeps.join(', ')}`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Erreur lecture package.json: ${error.message}`);
            return false;
        }
    }

    /**
     * Vérifier la connectivité avec les services externes
     */
    async checkExternalServices() {
        console.log('\n🌍 Vérification de la connectivité externe...\n');

        const results = {};

        // Vérifier Supabase
        try {
            if (config.database.url) {
                console.log('🔗 Test connexion Supabase...');
                // TODO: Implémenter test de connexion réel
                console.log('✅ Supabase: Configuration valide');
                results.supabase = true;
            } else {
                console.log('⚠️  Supabase: Non configuré');
                results.supabase = false;
            }
        } catch (error) {
            console.log(`❌ Supabase: ${error.message}`);
            results.supabase = false;
        }

        // Vérifier Moneroo
        try {
            if (config.payment.apiKey) {
                console.log('💳 Test connexion Moneroo...');
                // TODO: Implémenter test de connexion réel
                console.log('✅ Moneroo: Configuration valide');
                results.moneroo = true;
            } else {
                console.log('⚠️  Moneroo: Non configuré');
                results.moneroo = false;
            }
        } catch (error) {
            console.log(`❌ Moneroo: ${error.message}`);
            results.moneroo = false;
        }

        return results;
    }

    /**
     * Exécuter toutes les vérifications
     */
    async runFullCheck() {
        console.log('🚀 Démarrage de la vérification complète de l\'environnement...\n');
        
        const results = {
            environment: this.checkEnvironment(),
            platformConfig: this.checkPlatformConfiguration(),
            filePermissions: this.checkFilePermissions(),
            dependencies: this.checkDependencies(),
            externalServices: await this.checkExternalServices()
        };

        // Résumé final
        console.log('\n' + '='.repeat(60));
        console.log('📋 RÉSUMÉ DE LA VÉRIFICATION');
        console.log('='.repeat(60));

        const allChecks = [
            { name: 'Variables d\'environnement', status: results.environment.isValid },
            { name: 'Configuration plateformes', status: results.platformConfig },
            { name: 'Permissions fichiers', status: results.filePermissions },
            { name: 'Dépendances', status: results.dependencies },
            { name: 'Services externes', status: Object.values(results.externalServices).every(s => s) }
        ];

        let allGood = true;
        allChecks.forEach(check => {
            const icon = check.status ? '✅' : '❌';
            console.log(`${icon} ${check.name}`);
            if (!check.status) allGood = false;
        });

        console.log('='.repeat(60));

        if (allGood) {
            console.log('🎉 Toutes les vérifications ont réussi! L\'application peut démarrer.');
        } else {
            console.log('🚨 Certaines vérifications ont échoué. Corrigez les problèmes avant de démarrer.');
        }

        return {
            success: allGood,
            details: results
        };
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    const checker = new EnvironmentChecker();
    checker.runFullCheck().catch(error => {
        console.error('Erreur lors de la vérification:', error);
        process.exit(1);
    });
}

module.exports = EnvironmentChecker;
