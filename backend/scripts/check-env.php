<?php

/**
 * Script de vérification de l'environnement Tradefy
 * 
 * Vérifie que toutes les variables d'environnement requises sont configurées
 * et que les dépendances système sont disponibles.
 */

// Charger l'autoloader Composer
require_once __DIR__ . '/../vendor/autoload.php';

class EnvironmentChecker
{
    private $errors = [];
    private $warnings = [];
    private $success = [];

    public function run(): void
    {
        echo "🔍 Vérification de l'environnement Tradefy...\n";
        echo "==========================================\n\n";

        $this->checkPhpVersion();
        $this->checkPhpExtensions();
        $this->checkEnvironmentVariables();
        $this->checkFilePermissions();
        $this->checkDatabaseConnection();
        $this->checkExternalServices();

        $this->displayResults();
    }

    private function checkPhpVersion(): void
    {
        $required = '8.1.0';
        $current = PHP_VERSION;

        if (version_compare($current, $required, '>=')) {
            $this->success[] = "✓ PHP Version: $current (requise: $required+)";
        } else {
            $this->errors[] = "✗ PHP Version: $current (requise: $required+)";
        }
    }

    private function checkPhpExtensions(): void
    {
        $required = [
            'pdo',
            'pdo_pgsql',
            'json',
            'curl',
            'openssl',
            'mbstring',
            'fileinfo'
        ];

        $optional = [
            'gd' => 'Pour le traitement des images',
            'zip' => 'Pour la compression/décompression',
            'xml' => 'Pour le traitement XML'
        ];

        foreach ($required as $ext) {
            if (extension_loaded($ext)) {
                $this->success[] = "✓ Extension PHP: $ext";
            } else {
                $this->errors[] = "✗ Extension PHP manquante: $ext";
            }
        }

        foreach ($optional as $ext => $description) {
            if (!extension_loaded($ext)) {
                $this->warnings[] = "⚠ Extension PHP optionnelle manquante: $ext ($description)";
            } else {
                $this->success[] = "✓ Extension PHP optionnelle: $ext";
            }
        }
    }

    private function checkEnvironmentVariables(): void
    {
        $required = [
            'APP_ENV' => 'development|staging|production',
            'APP_URL' => 'URL de l\'application',
            'JWT_SECRET' => 'Clé secrète JWT',
            'DB_HOST' => 'Hôte de la base de données',
            'DB_NAME' => 'Nom de la base de données',
            'DB_USER' => 'Utilisateur de la base de données',
            'DB_PASSWORD' => 'Mot de passe de la base de données',
            'SUPABASE_URL' => 'URL Supabase',
            'SUPABASE_KEY' => 'Clé API Supabase',
            'MONEROO_API_KEY' => 'Clé API Moneroo',
            'MONEROO_SECRET_KEY' => 'Clé secrète Moneroo'
        ];

        $optional = [
            'SUPABASE_BUCKET' => 'tradefy-products',
            'MONEROO_BASE_URL' => 'https://api.moneroo.io/v1',
            'MONEROO_WEBHOOK_SECRET' => 'Clé secrète webhook Moneroo',
            'ALLOWED_ORIGINS' => 'Origines CORS autorisées',
            'SMTP_HOST' => 'Hôte SMTP pour les emails',
            'SMTP_PORT' => '587',
            'SMTP_USERNAME' => 'Utilisateur SMTP',
            'SMTP_PASSWORD' => 'Mot de passe SMTP'
        ];

        foreach ($required as $var => $description) {
            $value = getenv($var);
            if ($value === false || $value === '') {
                $this->errors[] = "✗ Variable d'environnement requise manquante: $var ($description)";
            } else {
                // Masquer les valeurs sensibles dans l'affichage
                $displayValue = in_array($var, ['JWT_SECRET', 'DB_PASSWORD', 'MONEROO_SECRET_KEY', 'SMTP_PASSWORD']) 
                    ? '***' . substr($value, -4) 
                    : $value;
                $this->success[] = "✓ Variable d'environnement: $var = $displayValue";
            }
        }

        foreach ($optional as $var => $default) {
            $value = getenv($var);
            if ($value === false || $value === '') {
                $this->warnings[] = "⚠ Variable d'environnement optionnelle manquante: $var (défaut: $default)";
            } else {
                $displayValue = in_array($var, ['SMTP_PASSWORD']) 
                    ? '***' . substr($value, -4) 
                    : $value;
                $this->success[] = "✓ Variable d'environnement optionnelle: $var = $displayValue";
            }
        }
    }

    private function checkFilePermissions(): void
    {
        $directories = [
            __DIR__ . '/../logs' => '0775',
            __DIR__ . '/../cache' => '0775',
            __DIR__ . '/../public/uploads' => '0775'
        ];

        foreach ($directories as $dir => $requiredPerm) {
            if (!is_dir($dir)) {
                // Essayer de créer le répertoire
                if (!mkdir($dir, 0775, true)) {
                    $this->errors[] = "✗ Répertoire manquant et impossible à créer: $dir";
                    continue;
                }
                $this->success[] = "✓ Répertoire créé: $dir";
            }

            $perms = substr(sprintf('%o', fileperms($dir)), -4);
            if ($perms !== $requiredPerm && $perms !== '0777') {
                $this->warnings[] = "⚠ Permissions du répertoire $dir: $perms (recommandé: $requiredPerm)";
            } else {
                $this->success[] = "✓ Permissions du répertoire $dir: $perms";
            }
        }

        // Vérifier que le .env existe
        $envFile = __DIR__ . '/../.env';
        if (!file_exists($envFile)) {
            $this->warnings[] = "⚠ Fichier .env manquant (copiez .env.example)";
        } else {
            $this->success[] = "✓ Fichier .env présent";
        }
    }

    private function checkDatabaseConnection(): void
    {
        try {
            \Tradefy\Config\Settings::initialize();
            $dbConfig = \Tradefy\Config\Settings::getDatabaseConfig();
            $dsn = \Tradefy\Config\Settings::getDatabaseDSN();

            $db = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5
            ]);

            // Tester une requête simple
            $stmt = $db->query('SELECT version()');
            $version = $stmt->fetchColumn();
            
            $this->success[] = "✓ Connexion à la base de données: OK";
            $this->success[] = "✓ Version PostgreSQL: " . explode(' ', $version)[0];

            // Vérifier les tables essentielles
            $requiredTables = ['users', 'products', 'orders', 'commission_ranks'];
            $stmt = $db->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            $existingTables = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $missingTables = array_diff($requiredTables, $existingTables);
            if (!empty($missingTables)) {
                $this->warnings[] = "⚠ Tables manquantes: " . implode(', ', $missingTables) . " (exécutez les migrations)";
            } else {
                $this->success[] = "✓ Tables essentielles présentes";
            }

        } catch (Exception $e) {
            $this->errors[] = "✗ Connexion à la base de données échouée: " . $e->getMessage();
        }
    }

    private function checkExternalServices(): void
    {
        // Vérifier Supabase
        try {
            $supabaseConfig = \Tradefy\Config\Settings::getSupabaseConfig();
            if (!empty($supabaseConfig['url']) && !empty($supabaseConfig['key'])) {
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => $supabaseConfig['url'] . '/rest/v1/',
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER => [
                        'Authorization: Bearer ' . $supabaseConfig['key'],
                        'apikey: ' . $supabaseConfig['key']
                    ],
                    CURLOPT_TIMEOUT => 10
                ]);
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode === 200) {
                    $this->success[] = "✓ Service Supabase: Accessible";
                } else {
                    $this->warnings[] = "⚠ Service Supabase: Erreur HTTP $httpCode";
                }
            }
        } catch (Exception $e) {
            $this->warnings[] = "⚠ Service Supabase: " . $e->getMessage();
        }

        // Vérifier Moneroo (test de configuration basique)
        try {
            $monerooConfig = \Tradefy\Config\Settings::getMonerooConfig();
            if (!empty($monerooConfig['api_key']) && !empty($monerooConfig['secret_key'])) {
                $this->success[] = "✓ Configuration Moneroo: Présente";
            } else {
                $this->warnings[] = "⚠ Configuration Moneroo: Clés API manquantes";
            }
        } catch (Exception $e) {
            $this->warnings[] = "⚠ Configuration Moneroo: " . $e->getMessage();
        }
    }

    private function displayResults(): void
    {
        echo "\n";

        // Afficher les succès
        if (!empty($this->success)) {
            echo "✅ SUCCÈS:\n";
            foreach ($this->success as $message) {
                echo "  $message\n";
            }
            echo "\n";
        }

        // Afficher les avertissements
        if (!empty($this->warnings)) {
            echo "⚠️  AVERTISSEMENTS:\n";
            foreach ($this->warnings as $message) {
                echo "  $message\n";
            }
            echo "\n";
        }

        // Afficher les erreurs
        if (!empty($this->errors)) {
            echo "❌ ERREURS:\n";
            foreach ($this->errors as $message) {
                echo "  $message\n";
            }
            echo "\n";
        }

        // Résumé
        $totalChecks = count($this->success) + count($this->warnings) + count($this->errors);
        
        echo "==========================================\n";
        echo "RÉSUMÉ:\n";
        echo "  ✅ Succès: " . count($this->success) . "\n";
        echo "  ⚠️  Avertissements: " . count($this->warnings) . "\n";
        echo "  ❌ Erreurs: " . count($this->errors) . "\n";
        echo "  📊 Total: $totalChecks vérifications\n\n";

        if (empty($this->errors)) {
            if (empty($this->warnings)) {
                echo "🎉 Toutes les vérifications ont réussi ! L'environnement est prêt.\n";
                exit(0);
            } else {
                echo "⚠️  L'environnement est fonctionnel mais avec des avertissements.\n";
                exit(0);
            }
        } else {
            echo "❌ Des erreurs critiques doivent être résolues avant de continuer.\n";
            exit(1);
        }
    }
}

// Exécuter le vérificateur
try {
    $checker = new EnvironmentChecker();
    $checker->run();
} catch (Exception $e) {
    echo "❌ Erreur lors de la vérification de l'environnement: " . $e->getMessage() . "\n";
    exit(1);
}