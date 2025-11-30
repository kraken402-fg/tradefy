const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/platforms');

/**
 * Script de migration de la base de données
 */
class DatabaseMigrator {
    constructor() {
        this.pool = null;
        this.migrationsPath = path.join(__dirname, '..', 'migrations');
        this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    }

    /**
     * Initialiser la connexion à la base de données
     */
    async initializeConnection() {
        try {
            console.log('🔗 Initialisation de la connexion à la base de données...');
            
            this.pool = new Pool({
                connectionString: config.database.url,
                ssl: config.environment === 'production' ? { rejectUnauthorized: false } : false
            });

            // Tester la connexion
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            console.log('✅ Connexion à la base de données établie');
            return true;
        } catch (error) {
            console.error('❌ Erreur de connexion à la base de données:', error.message);
            return false;
        }
    }

    /**
     * Créer la table des migrations si elle n'existe pas
     */
    async createMigrationsTable() {
        try {
            console.log('📋 Création de la table des migrations...');
            
            const query = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    checksum VARCHAR(64) NOT NULL
                );
            `;
            
            await this.pool.query(query);
            console.log('✅ Table des migrations créée');
            return true;
        } catch (error) {
            console.error('❌ Erreur création table migrations:', error.message);
            return false;
        }
    }

    /**
     * Obtenir les migrations déjà exécutées
     */
    async getExecutedMigrations() {
        try {
            const query = 'SELECT filename, checksum FROM migrations ORDER BY executed_at';
            const result = await this.pool.query(query);
            
            const migrations = {};
            result.rows.forEach(row => {
                migrations[row.filename] = row.checksum;
            });
            
            return migrations;
        } catch (error) {
            console.error('❌ Erreur récupération migrations exécutées:', error.message);
            return {};
        }
    }

    /**
     * Calculer le checksum d'un fichier
     */
    calculateChecksum(content) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Exécuter le schéma principal
     */
    async executeSchema() {
        try {
            console.log('🗄️  Exécution du schéma principal...');
            
            if (!fs.existsSync(this.schemaPath)) {
                console.log('⚠️  Fichier schema.sql non trouvé');
                return false;
            }

            const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
            
            // Diviser le contenu en instructions SQL
            const statements = schemaContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            const client = await this.pool.connect();
            
            try {
                // Commencer une transaction
                await client.query('BEGIN');
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await client.query(statement);
                    }
                }
                
                // Valider la transaction
                await client.query('COMMIT');
                console.log('✅ Schéma exécuté avec succès');
                return true;
                
            } catch (error) {
                // Annuler la transaction en cas d'erreur
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
        } catch (error) {
            console.error('❌ Erreur exécution schéma:', error.message);
            return false;
        }
    }

    /**
     * Obtenir la liste des fichiers de migration
     */
    getMigrationFiles() {
        try {
            if (!fs.existsSync(this.migrationsPath)) {
                console.log('📁 Dossier migrations non trouvé, utilisation du schéma principal uniquement');
                return [];
            }

            const files = fs.readdirSync(this.migrationsPath)
                .filter(file => file.endsWith('.sql'))
                .sort(); // Trier par ordre alphabétique = ordre chronologique

            return files;
        } catch (error) {
            console.error('❌ Erreur lecture dossier migrations:', error.message);
            return [];
        }
    }

    /**
     * Exécuter une migration
     */
    async executeMigration(filename) {
        try {
            console.log(`🔄 Exécution de la migration: ${filename}`);
            
            const filePath = path.join(this.migrationsPath, filename);
            const content = fs.readFileSync(filePath, 'utf8');
            const checksum = this.calculateChecksum(content);

            const client = await this.pool.connect();
            
            try {
                // Commencer une transaction
                await client.query('BEGIN');
                
                // Exécuter la migration
                await client.query(content);
                
                // Enregistrer la migration
                await client.query(
                    'INSERT INTO migrations (filename, checksum) VALUES ($1, $2)',
                    [filename, checksum]
                );
                
                // Valider la transaction
                await client.query('COMMIT');
                console.log(`✅ Migration ${filename} exécutée avec succès`);
                return true;
                
            } catch (error) {
                // Annuler la transaction en cas d'erreur
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
        } catch (error) {
            console.error(`❌ Erreur exécution migration ${filename}:`, error.message);
            return false;
        }
    }

    /**
     * Vérifier si une migration a déjà été exécutée
     */
    isMigrationExecuted(filename, executedMigrations) {
        return executedMigrations.hasOwnProperty(filename);
    }

    /**
     * Vérifier si une migration a été modifiée
     */
    isMigrationModified(filename, executedMigrations) {
        if (!this.isMigrationExecuted(filename, executedMigrations)) {
            return false;
        }

        const filePath = path.join(this.migrationsPath, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        const currentChecksum = this.calculateChecksum(content);
        const executedChecksum = executedMigrations[filename];

        return currentChecksum !== executedChecksum;
    }

    /**
     * Exécuter toutes les migrations en attente
     */
    async runMigrations(options = {}) {
        const { force = false, skipSchema = false } = options;

        try {
            console.log('🚀 Démarrage des migrations de base de données...\n');

            // Initialiser la connexion
            const connected = await this.initializeConnection();
            if (!connected) {
                return { success: false, error: 'Impossible de se connecter à la base de données' };
            }

            // Créer la table des migrations
            await this.createMigrationsTable();

            // Obtenir les migrations déjà exécutées
            const executedMigrations = await this.getExecutedMigrations();

            // Exécuter le schéma principal si nécessaire
            if (!skipSchema) {
                const schemaExecuted = await this.executeSchema();
                if (!schemaExecuted) {
                    return { success: false, error: 'Échec de l\'exécution du schéma' };
                }
            }

            // Obtenir les fichiers de migration
            const migrationFiles = this.getMigrationFiles();
            
            if (migrationFiles.length === 0) {
                console.log('📋 Aucune migration supplémentaire à exécuter');
                return { success: true, message: 'Base de données à jour' };
            }

            console.log(`📋 ${migrationFiles.length} fichier(s) de migration trouvé(s)`);

            let executedCount = 0;
            let errorCount = 0;

            for (const filename of migrationFiles) {
                try {
                    // Vérifier si la migration a déjà été exécutée
                    if (this.isMigrationExecuted(filename, executedMigrations)) {
                        
                        // Vérifier si la migration a été modifiée
                        if (this.isMigrationModified(filename, executedMigrations)) {
                            if (!force) {
                                console.log(`⚠️  Migration ${filename} modifiée. Utilisez --force pour réexécuter.`);
                                continue;
                            }
                            console.log(`🔄 Migration ${filename} modifiée, réexécution forcée...`);
                        } else {
                            console.log(`⏭️  Migration ${filename} déjà exécutée`);
                            continue;
                        }
                    }

                    // Exécuter la migration
                    const success = await this.executeMigration(filename);
                    if (success) {
                        executedCount++;
                    } else {
                        errorCount++;
                        if (!force) {
                            break; // Arrêter en cas d'erreur sauf si mode forcé
                        }
                    }

                } catch (error) {
                    console.error(`❌ Erreur traitement migration ${filename}:`, error.message);
                    errorCount++;
                    if (!force) break;
                }
            }

            // Résumé
            console.log('\n' + '='.repeat(60));
            console.log('📋 RÉSUMÉ DES MIGRATIONS');
            console.log('='.repeat(60));
            console.log(`✅ Migrations exécutées: ${executedCount}`);
            console.log(`❌ Erreurs: ${errorCount}`);
            console.log(`📋 Total traitées: ${executedCount + errorCount}`);

            const success = errorCount === 0;
            console.log(success ? '🎉 Toutes les migrations ont réussi!' : '🚨 Certaines migrations ont échoué');

            return {
                success,
                executedCount,
                errorCount,
                message: success ? 'Migrations terminées avec succès' : 'Erreurs lors des migrations'
            };

        } catch (error) {
            console.error('❌ Erreur générale des migrations:', error.message);
            return { success: false, error: error.message };
        } finally {
            // Fermer la connexion
            if (this.pool) {
                await this.pool.end();
            }
        }
    }

    /**
     * Créer un nouveau fichier de migration
     */
    createMigrationFile(name) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
        const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
        const filePath = path.join(this.migrationsPath, filename);

        // Créer le dossier migrations s'il n'existe pas
        if (!fs.existsSync(this.migrationsPath)) {
            fs.mkdirSync(this.migrationsPath, { recursive: true });
        }

        // Créer le fichier de migration
        const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

-- Ajoutez vos instructions SQL ici
-- Exemple:
-- ALTER TABLE users ADD COLUMN new_column VARCHAR(255);

`;

        fs.writeFileSync(filePath, template);
        console.log(`✅ Fichier de migration créé: ${filename}`);
        return filePath;
    }

    /**
     * Obtenir le statut des migrations
     */
    async getMigrationStatus() {
        try {
            const connected = await this.initializeConnection();
            if (!connected) {
                return { success: false, error: 'Impossible de se connecter à la base de données' };
            }

            await this.createMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();
            const migrationFiles = this.getMigrationFiles();

            const status = {
                pending: [],
                executed: [],
                modified: []
            };

            for (const filename of migrationFiles) {
                if (this.isMigrationExecuted(filename, executedMigrations)) {
                    if (this.isMigrationModified(filename, executedMigrations)) {
                        status.modified.push(filename);
                    } else {
                        status.executed.push(filename);
                    }
                } else {
                    status.pending.push(filename);
                }
            }

            return { success: true, status };

        } catch (error) {
            console.error('❌ Erreur obtention statut migrations:', error.message);
            return { success: false, error: error.message };
        } finally {
            if (this.pool) {
                await this.pool.end();
            }
        }
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    
    // Parser les arguments de ligne de commande
    const args = process.argv.slice(2);
    const options = {
        force: args.includes('--force'),
        skipSchema: args.includes('--skip-schema')
    };

    // Vérifier les commandes spéciales
    if (args.includes('--status')) {
        migrator.getMigrationStatus().then(result => {
            if (result.success) {
                console.log('\n📊 STATUT DES MIGRATIONS:');
                console.log(`⏳ En attente: ${result.status.pending.length}`);
                console.log(`✅ Exécutées: ${result.status.executed.length}`);
                console.log(`🔄 Modifiées: ${result.status.modified.length}`);
                
                if (result.status.pending.length > 0) {
                    console.log('\n⏳ Migrations en attente:');
                    result.status.pending.forEach(file => console.log(`  - ${file}`));
                }
                
                if (result.status.modified.length > 0) {
                    console.log('\n🔄 Migrations modifiées:');
                    result.status.modified.forEach(file => console.log(`  - ${file} (utilisez --force pour réexécuter)`));
                }
            } else {
                console.error('❌ Erreur:', result.error);
            }
        });
    } else if (args.includes('--create') && args.length > 1) {
        const migrationName = args[args.indexOf('--create') + 1];
        migrator.createMigrationFile(migrationName);
    } else {
        // Exécuter les migrations
        migrator.runMigrations(options).then(result => {
            process.exit(result.success ? 0 : 1);
        });
    }
}

module.exports = DatabaseMigrator;
