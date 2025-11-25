<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Tradefy\Config\Settings;

class DatabaseMigrator
{
    private $db;
    private $migrationsPath;

    public function __construct(PDO $db, string $migrationsPath)
    {
        $this->db = $db;
        $this->migrationsPath = $migrationsPath;
    }

    /**
     * Run all migrations
     */
    public function migrate(): void
    {
        echo "Starting database migrations...\n";

        // Create migrations table if it doesn't exist
        $this->createMigrationsTable();

        // Get already run migrations
        $runMigrations = $this->getRunMigrations();

        // Run schema migration
        if (!in_array('schema', $runMigrations)) {
            $this->runMigration('schema.sql', 'schema');
        }

        // Run seeds if in development
        if (Settings::isDevelopment() && !in_array('seeds', $runMigrations)) {
            $this->runMigration('seeds.sql', 'seeds');
        }

        echo "Database migrations completed successfully!\n";
    }

    /**
     * Create migrations table
     */
    private function createMigrationsTable(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        ";

        $this->db->exec($sql);
    }

    /**
     * Get already executed migrations
     */
    private function getRunMigrations(): array
    {
        $stmt = $this->db->query("SELECT name FROM migrations ORDER BY executed_at");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    /**
     * Run a single migration file
     */
    private function runMigration(string $filename, string $migrationName): void
    {
        $filepath = $this->migrationsPath . '/' . $filename;
        
        if (!file_exists($filepath)) {
            throw new Exception("Migration file not found: {$filepath}");
        }

        echo "Running migration: {$filename}\n";

        // Read SQL file
        $sql = file_get_contents($filepath);

        // Split into individual statements
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function($stmt) {
                return !empty($stmt) && substr($stmt, 0, 2) !== '--';
            }
        );

        // Execute each statement
        $this->db->beginTransaction();
        
        try {
            foreach ($statements as $statement) {
                if (!empty(trim($statement))) {
                    $this->db->exec($statement);
                }
            }

            // Record migration
            $stmt = $this->db->prepare("INSERT INTO migrations (name) VALUES (?)");
            $stmt->execute([$migrationName]);

            $this->db->commit();
            echo "✓ Migration {$filename} completed\n";

        } catch (Exception $e) {
            $this->db->rollBack();
            throw new Exception("Migration failed: {$filename} - " . $e->getMessage());
        }
    }

    /**
     * Rollback last migration
     */
    public function rollback(): void
    {
        echo "Rolling back last migration...\n";

        $this->db->beginTransaction();
        
        try {
            // Get last migration
            $stmt = $this->db->query("SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1");
            $lastMigration = $stmt->fetch(PDO::FETCH_COLUMN);

            if ($lastMigration) {
                // Basic rollback logic - in production you'd have more sophisticated rollback scripts
                if ($lastMigration === 'seeds') {
                    $this->rollbackSeeds();
                }

                // Remove migration record
                $stmt = $this->db->prepare("DELETE FROM migrations WHERE name = ?");
                $stmt->execute([$lastMigration]);

                echo "✓ Rollback completed for: {$lastMigration}\n";
            } else {
                echo "No migrations to rollback\n";
            }

            $this->db->commit();

        } catch (Exception $e) {
            $this->db->rollBack();
            throw new Exception("Rollback failed: " . $e->getMessage());
        }
    }

    /**
     * Rollback seed data
     */
    private function rollbackSeeds(): void
    {
        // Remove sample data while keeping essential data
        $this->db->exec("DELETE FROM webhook_logs WHERE id > 0");
        $this->db->exec("DELETE FROM integrations WHERE id > 0");
        $this->db->exec("DELETE FROM orders WHERE id > 0");
        $this->db->exec("DELETE FROM products WHERE vendor_id IN (SELECT id FROM users WHERE email LIKE '%@tradefy.com' AND email != 'admin@tradefy.com')");
        $this->db->exec("DELETE FROM users WHERE email LIKE '%@tradefy.com' AND email != 'admin@tradefy.com' AND role != 'admin'");
    }

    /**
     * Show migration status
     */
    public function status(): void
    {
        $migrations = $this->getRunMigrations();
        
        echo "Migration Status:\n";
        echo "================\n";
        
        $availableMigrations = ['schema', 'seeds'];
        
        foreach ($availableMigrations as $migration) {
            $status = in_array($migration, $migrations) ? '✓ Applied' : '✗ Pending';
            echo "{$migration}: {$status}\n";
        }
        
        echo "\nTotal: " . count($migrations) . "/" . count($availableMigrations) . " migrations applied\n";
    }
}

// CLI handler
if (php_sapi_name() === 'cli') {
    $action = $argv[1] ?? 'migrate';
    
    try {
        // Initialize settings and database
        Settings::initialize();
        $dbConfig = Settings::getDatabaseConfig();
        $dsn = Settings::getDatabaseDSN();
        
        $db = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);

        $migrator = new DatabaseMigrator($db, __DIR__);

        switch ($action) {
            case 'migrate':
                $migrator->migrate();
                break;
                
            case 'rollback':
                $migrator->rollback();
                break;
                
            case 'status':
                $migrator->status();
                break;
                
            default:
                echo "Usage: php migrate.php [migrate|rollback|status]\n";
                break;
        }

    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}