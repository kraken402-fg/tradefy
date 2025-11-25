<?php

/**
 * Script de migration de base de données Tradefy
 * 
 * Gère l'application des migrations, rollbacks et statut de la base de données
 */

// Charger l'autoloader Composer
require_once __DIR__ . '/../vendor/autoload.php';

class DatabaseMigrator
{
    private $db;
    private $migrationsTable = 'migrations';
    private $migrationsPath = __DIR__ . '/../.migrations';

    public function __construct()
    {
        // Initialiser la configuration
        \Tradefy\Config\Settings::initialize();
        
        // Connexion à la base de données
        $dbConfig = \Tradefy\Config\Settings::getDatabaseConfig();
        $dsn = \Tradefy\Config\Settings::getDatabaseDSN();
        
        $this->db = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);

        // Créer la table des migrations si elle n'existe pas
        $this->createMigrationsTable();
    }

    /**
     * Créer la table de suivi des migrations
     */
    private function createMigrationsTable(): void
    {
        $sql = "CREATE TABLE IF NOT EXISTS {$this->migrationsTable} (
            id SERIAL PRIMARY KEY,
            migration VARCHAR(255) UNIQUE NOT NULL,
            batch INTEGER NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )";

        $this->db->exec($sql);
    }

    /**
     * Obtenir les migrations déjà appliquées
     */
    private function getAppliedMigrations(): array
    {
        $stmt = $this->db->query("SELECT migration FROM {$this->migrationsTable} ORDER BY id");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    /**
     * Obtenir les fichiers de migration disponibles
     */
    private function getMigrationFiles(): array
    {
        if (!is_dir($this->migrationsPath)) {
            throw new Exception("Le dossier des migrations n'existe pas: {$this->migrationsPath}");
        }

        $files = glob($this->migrationsPath . '/*.sql');
        sort($files); // Trier par ordre alphabétique
        
        return $files;
    }

    /**
     * Obtenir le prochain numéro de batch
     */
    private function getNextBatch(): int
    {
        $stmt = $this->db->query("SELECT MAX(batch) as max_batch FROM {$this->migrationsTable}");
        $result = $stmt->fetch();
        
        return ($result['max_batch'] ?? 0) + 1;
    }

    /**
     * Exécuter une migration
     */
    private function runMigration(string $filePath, int $batch): void
    {
        $migrationName = basename($filePath);
        
        echo "🔧 Application de la migration: {$migrationName}\n";

        // Lire le fichier SQL
        $sql = file_get_contents($filePath);
        if ($sql === false) {
            throw new Exception("Impossible de lire le fichier de migration: {$filePath}");
        }

        // Démarrer une transaction
        $this->db->beginTransaction();

        try {
            // Exécuter le SQL
            $this->db->exec($sql);
            
            // Enregistrer la migration
            $stmt = $this->db->prepare(
                "INSERT INTO {$this->migrationsTable} (migration, batch) VALUES (?, ?)"
            );
            $stmt->execute([$migrationName, $batch]);
            
            // Commit de la transaction
            $this->db->commit();
            
            echo "✅ Migration appliquée: {$migrationName}\n";
            
        } catch (Exception $e) {
            // Rollback en cas d'erreur
            $this->db->rollBack();
            throw new Exception("Erreur lors de l'application de {$migrationName}: " . $e->getMessage());
        }
    }

    /**
     * Appliquer les migrations en attente
     */
    public function migrate(): void
    {
        echo "🚀 Démarrage des migrations...\n";
        echo "==============================\n\n";

        $appliedMigrations = $this->getAppliedMigrations();
        $migrationFiles = $this->getMigrationFiles();
        $batch = $this->getNextBatch();

        $pendingMigrations = array_filter($migrationFiles, function($file) use ($appliedMigrations) {
            return !in_array(basename($file), $appliedMigrations);
        });

        if (empty($pendingMigrations)) {
            echo "✅ Aucune migration en attente.\n";
            return;
        }

        echo "📋 Migrations en attente: " . count($pendingMigrations) . "\n\n";

        foreach ($pendingMigrations as $file) {
            $this->runMigration($file, $batch);
        }

        echo "\n🎉 Toutes les migrations ont été appliquées avec succès!\n";
    }

    /**
     * Annuler la dernière série de migrations
     */
    public function rollback(): void
    {
        echo "↩️  Rollback des migrations...\n";
        echo "============================\n\n";

        // Obtenir le dernier batch
        $stmt = $this->db->query("SELECT MAX(batch) as max_batch FROM {$this->migrationsTable}");
        $result = $stmt->fetch();
        $lastBatch = $result['max_batch'] ?? 0;

        if ($lastBatch === 0) {
            echo "✅ Aucune migration à rollback.\n";
            return;
        }

        // Obtenir les migrations du dernier batch
        $stmt = $this->db->prepare(
            "SELECT migration FROM {$this->migrationsTable} WHERE batch = ? ORDER BY id DESC"
        );
        $stmt->execute([$lastBatch]);
        $migrationsToRollback = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($migrationsToRollback)) {
            echo "✅ Aucune migration à rollback.\n";
            return;
        }

        echo "📋 Migrations à rollback: " . count($migrationsToRollback) . "\n\n";

        foreach ($migrationsToRollback as $migration) {
            $this->rollbackMigration($migration);
        }

        echo "\n✅ Rollback terminé pour le batch {$lastBatch}.\n";
    }

    /**
     * Rollback d'une migration spécifique
     */
    private function rollbackMigration(string $migrationName): void
    {
        echo "↩️  Rollback de: {$migrationName}\n";

        // Note: Pour un rollback complet, nous aurions besoin de fichiers de rollback séparés
        // Pour l'instant, on se contente de supprimer l'enregistrement
        // En production, vous devriez avoir des fichiers _down.sql pour le rollback
        
        $this->db->beginTransaction();

        try {
            // Supprimer l'enregistrement de migration
            $stmt = $this->db->prepare(
                "DELETE FROM {$this->migrationsTable} WHERE migration = ?"
            );
            $stmt->execute([$migrationName]);
            
            $this->db->commit();
            
            echo "✅ Rollback effectué: {$migrationName}\n";
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw new Exception("Erreur lors du rollback de {$migrationName}: " . $e->getMessage());
        }
    }

    /**
     * Afficher le statut des migrations
     */
    public function status(): void
    {
        echo "📊 Statut des migrations...\n";
        echo "==========================\n\n";

        $appliedMigrations = $this->getAppliedMigrations();
        $migrationFiles = $this->getMigrationFiles();

        echo "Migrations appliquées: " . count($appliedMigrations) . "\n";
        echo "Migrations disponibles: " . count($migrationFiles) . "\n";
        echo "Migrations en attente: " . (count($migrationFiles) - count($appliedMigrations)) . "\n\n";

        if (empty($migrationFiles)) {
            echo "ℹ️  Aucun fichier de migration trouvé.\n";
            return;
        }

        echo "Détail des migrations:\n";
        echo "----------------------\n";

        foreach ($migrationFiles as $file) {
            $migrationName = basename($file);
            $status = in_array($migrationName, $appliedMigrations) ? '✅ APPLIQUÉE' : '⏳ EN ATTENTE';
            echo "{$status} - {$migrationName}\n";
        }

        // Afficher les batches
        $stmt = $this->db->query("
            SELECT batch, COUNT(*) as migration_count, 
                   MIN(applied_at) as first_applied, 
                   MAX(applied_at) as last_applied
            FROM {$this->migrationsTable} 
            GROUP BY batch 
            ORDER BY batch DESC
        ");
        $batches = $stmt->fetchAll();

        if (!empty($batches)) {
            echo "\n📦 Batches de migrations:\n";
            echo "------------------------\n";
            
            foreach ($batches as $batch) {
                echo "Batch {$batch['batch']}: {$batch['migration_count']} migrations ";
                echo "(du {$batch['first_applied']} au {$batch['last_applied']})\n";
            }
        }
    }

    /**
     * Réinitialiser complètement la base de données (DANGEREUX - développement uniquement)
     */
    public function reset(): void
    {
        if (\Tradefy\Config\Settings::isProduction()) {
            throw new Exception("Reset de base de données interdit en production!");
        }

        echo "🔄 Réinitialisation de la base de données...\n";
        echo "==========================================\n\n";

        echo "⚠️  ATTENTION: Cette action va supprimer toutes les données!\n";
        echo "Voulez-vous continuer? (yes/no): ";
        
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        fclose($handle);

        if (trim($line) !== 'yes') {
            echo "❌ Opération annulée.\n";
            return;
        }

        // Obtenir toutes les tables
        $stmt = $this->db->query("
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        ");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // Désactiver les contraintes
        $this->db->exec('SET session_replication_role = replica;');

        foreach ($tables as $table) {
            if ($table !== $this->migrationsTable) {
                echo "🗑️  Suppression de la table: {$table}\n";
                $this->db->exec("DROP TABLE IF EXISTS {$table} CASCADE");
            }
        }

        // Réactiver les contraintes
        $this->db->exec('SET session_replication_role = DEFAULT;');

        // Vider la table des migrations
        $this->db->exec("TRUNCATE TABLE {$this->migrationsTable}");

        echo "\n✅ Base de données réinitialisée.\n";
        echo "💡 Exécutez 'php migrate.php migrate' pour recréer la structure.\n";
    }

    /**
     * Créer un nouveau fichier de migration
     */
    public function make(string $name): void
    {
        $timestamp = date('Y_m_d_His');
        $filename = "{$timestamp}_{$name}.sql";
        $filepath = $this->migrationsPath . '/' . $filename;

        if (!is_dir($this->migrationsPath)) {
            mkdir($this->migrationsPath, 0755, true);
        }

        $template = "-- Migration: {$name}
-- Created: " . date('Y-m-d H:i:s') . "

-- ⬆️ Migration UP
-- Ajoutez votre code SQL ici

-- Exemple:
-- CREATE TABLE new_table (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- ⬇️ Migration DOWN (pour rollback)
-- Ajoutez le code pour annuler la migration

-- Exemple:
-- DROP TABLE IF EXISTS new_table;
";

        if (file_put_contents($filepath, $template) !== false) {
            echo "✅ Nouveau fichier de migration créé: {$filename}\n";
            echo "📁 Emplacement: {$filepath}\n";
        } else {
            throw new Exception("Erreur lors de la création du fichier: {$filepath}");
        }
    }
}

// Gestion des commandes
function showHelp(): void
{
    echo "📖 Utilisation: php migrate.php [commande]\n\n";
    echo "Commandes disponibles:\n";
    echo "  migrate     - Appliquer les migrations en attente\n";
    echo "  rollback    - Annuler la dernière série de migrations\n";
    echo "  status      - Afficher le statut des migrations\n";
    echo "  reset       - Réinitialiser complètement la base (DEV uniquement)\n";
    echo "  make [name] - Créer un nouveau fichier de migration\n";
    echo "  help        - Afficher cette aide\n\n";
    echo "Exemples:\n";
    echo "  php migrate.php migrate\n";
    echo "  php migrate.php rollback\n";
    echo "  php migrate.php status\n";
    echo "  php migrate.php make add_new_feature\n";
}

// Point d'entrée principal
try {
    $command = $argv[1] ?? 'help';
    $migrator = new DatabaseMigrator();

    switch ($command) {
        case 'migrate':
            $migrator->migrate();
            break;
            
        case 'rollback':
            $migrator->rollback();
            break;
            
        case 'status':
            $migrator->status();
            break;
            
        case 'reset':
            $migrator->reset();
            break;
            
        case 'make':
            $name = $argv[2] ?? null;
            if (!$name) {
                echo "❌ Usage: php migrate.php make [nom_de_la_migration]\n";
                exit(1);
            }
            $migrator->make($name);
            break;
            
        case 'help':
        default:
            showHelp();
            break;
    }
    
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}