<?php

/**
 * Tradefy API - Point d'entrée principal
 * 
 * @package Tradefy
 * @version 3.0.0
 */

// Debug settings (à désactiver en production)
if (getenv('APP_DEBUG') === 'true') {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(0);
}

// Headers de sécurité de base
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Définir le fuseau horaire
date_default_timezone_set('UTC');

// Charger l'autoloader Composer
require_once __DIR__ . '/../vendor/autoload.php';

// Gestion des erreurs globales
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Logger l'erreur
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    
    // En production, ne pas afficher les détails des erreurs
    if (getenv('APP_ENV') === 'production') {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Internal server error',
            'timestamp' => time()
        ]);
        exit;
    }
    
    return false; // Laisser PHP gérer l'erreur normalement en développement
});

// Gestion des exceptions globales
set_exception_handler(function(Throwable $e) {
    error_log("Uncaught Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    
    $response = [
        'success' => false,
        'error' => 'Internal server error',
        'timestamp' => time()
    ];
    
    // En développement, inclure plus de détails
    if (getenv('APP_ENV') !== 'production') {
        $response['debug'] = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTrace()
        ];
    }
    
    http_response_code(500);
    echo json_encode($response);
    exit;
});

// Vérifier les dépendances critiques
function checkDependencies(): void
{
    $requiredExtensions = ['pdo', 'pdo_pgsql', 'json', 'curl', 'openssl'];
    $missingExtensions = [];
    
    foreach ($requiredExtensions as $ext) {
        if (!extension_loaded($ext)) {
            $missingExtensions[] = $ext;
        }
    }
    
    if (!empty($missingExtensions)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required PHP extensions',
            'missing_extensions' => $missingExtensions,
            'timestamp' => time()
        ]);
        exit;
    }
    
    // Vérifier la version de PHP
    if (version_compare(PHP_VERSION, '8.1.0') < 0) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'PHP 8.1 or higher is required',
            'current_version' => PHP_VERSION,
            'timestamp' => time()
        ]);
        exit;
    }
}

// Point d'entrée principal de l'API
try {
    // Vérifier les dépendances
    checkDependencies();
    
    // Démarrer l'application
    $router = \Tradefy\Routes\bootstrapApplication();
    $router->route();
    
} catch (Throwable $e) {
    // Logger l'erreur critique
    error_log("Critical Application Error: " . $e->getMessage());
    
    $response = [
        'success' => false,
        'error' => 'Application startup failed',
        'timestamp' => time()
    ];
    
    // En développement, afficher plus de détails
    if (getenv('APP_ENV') !== 'production') {
        $response['debug'] = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
    }
    
    http_response_code(500);
    echo json_encode($response);
    exit;
}

// Endpoint de santé simple (accessible directement)
if (php_sapi_name() === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    // Servir les fichiers statiques en développement
    if (preg_match('/\.(?:png|jpg|jpeg|gif|css|js|ico)$/', $path)) {
        return false; // Laisser le serveur interne PHP servir le fichier
    }
    
    // Route de santé simple
    if ($path === '/health' || $path === '/api/health') {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'ok',
            'service' => 'Tradefy API',
            'version' => '3.0.0',
            'timestamp' => time()
        ]);
        exit;
    }
}