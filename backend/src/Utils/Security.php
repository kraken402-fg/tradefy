<?php

namespace Tradefy\Utils;

use Tradefy\Config\Settings;
use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class Security
{
    private static $initialized = false;
    private static $jwtSecret;

    /**
     * Initialize security system
     */
    public static function initialize(?string $jwtSecret = null): void
    {
        self::$jwtSecret = $jwtSecret ?? Settings::getJwtSecret();
        
        if (empty(self::$jwtSecret)) {
            throw new Exception('JWT secret is required for security initialization');
        }
        
        self::$initialized = true;
    }

    /**
     * Generate JWT token for user
     */
    public static function generateToken(array $userData): string
    {
        self::checkInitialized();

        $payload = [
            'iss' => Settings::getAppUrl(), // Issuer
            'aud' => Settings::getAppUrl(), // Audience
            'iat' => time(), // Issued at
            'exp' => time() + Settings::getJwtExpiration(), // Expiration
            'user_id' => $userData['user_id'] ?? null,
            'email' => $userData['email'] ?? null,
            'role' => $userData['role'] ?? 'user',
            'vendor_id' => $userData['vendor_id'] ?? null
        ];

        return JWT::encode($payload, self::$jwtSecret, Settings::getJwtAlgorithm());
    }

    /**
     * Validate and decode JWT token
     */
    public static function validateToken(string $token): array
    {
        self::checkInitialized();

        try {
            $decoded = JWT::decode($token, new Key(self::$jwtSecret, Settings::getJwtAlgorithm()));
            return (array) $decoded;
        } catch (\Firebase\JWT\ExpiredException $e) {
            throw new Exception('Token has expired');
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            throw new Exception('Invalid token signature');
        } catch (Exception $e) {
            throw new Exception('Invalid token: ' . $e->getMessage());
        }
    }

    /**
     * Refresh JWT token
     */
    public static function refreshToken(string $token): string
    {
        $userData = self::validateToken($token);
        
        // Remove expiration from original payload
        unset($userData['exp'], $userData['iat'], $userData['iss'], $userData['aud']);
        
        return self::generateToken($userData);
    }

    /**
     * Validate password strength
     */
    public static function validatePassword(string $password): array
    {
        $errors = [];

        // Minimum length
        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters long';
        }

        // Uppercase letter
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        // Lowercase letter
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }

        // Number
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }

        // Special character
        if (!preg_match('/[!@#$%^&*()\-_=+{};:,<.>]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Hash password using bcrypt
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    /**
     * Verify password against hash
     */
    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * Generate random token (for API keys, reset tokens, etc.)
     */
    public static function generateRandomToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }

    /**
     * Sanitize input data
     */
    public static function sanitizeInput($input)
    {
        if (is_array($input)) {
            return array_map([self::class, 'sanitizeInput'], $input);
        }

        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Validate email format
     */
    public static function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Generate CSRF token
     */
    public static function generateCsrfToken(): string
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $token = self::generateRandomToken(32);
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_token_time'] = time();

        return $token;
    }

    /**
     * Validate CSRF token
     */
    public static function validateCsrfToken(string $token): bool
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
            return false;
        }

        // Token expiration (1 hour)
        if (time() - $_SESSION['csrf_token_time'] > 3600) {
            unset($_SESSION['csrf_token'], $_SESSION['csrf_token_time']);
            return false;
        }

        $isValid = hash_equals($_SESSION['csrf_token'], $token);
        
        // Consume token after validation
        if ($isValid) {
            unset($_SESSION['csrf_token'], $_SESSION['csrf_token_time']);
        }

        return $isValid;
    }

    /**
     * Encrypt data
     */
    public static function encryptData(string $data, string $key): string
    {
        $method = 'AES-256-CBC';
        $ivLength = openssl_cipher_iv_length($method);
        $iv = openssl_random_pseudo_bytes($ivLength);
        
        $encrypted = openssl_encrypt($data, $method, $key, OPENSSL_RAW_DATA, $iv);
        $hmac = hash_hmac('sha256', $encrypted, $key, true);
        
        return base64_encode($iv . $hmac . $encrypted);
    }

    /**
     * Decrypt data
     */
    public static function decryptData(string $encryptedData, string $key): string
    {
        $data = base64_decode($encryptedData);
        $method = 'AES-256-CBC';
        $ivLength = openssl_cipher_iv_length($method);
        
        $iv = substr($data, 0, $ivLength);
        $hmac = substr($data, $ivLength, 32);
        $encrypted = substr($data, $ivLength + 32);
        
        $calculatedHmac = hash_hmac('sha256', $encrypted, $key, true);
        
        if (!hash_equals($hmac, $calculatedHmac)) {
            throw new Exception('HMAC verification failed');
        }
        
        return openssl_decrypt($encrypted, $method, $key, OPENSSL_RAW_DATA, $iv);
    }

    /**
     * Get client IP address
     */
    public static function getClientIp(): string
    {
        $ip = '';
        
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED'];
        } elseif (!empty($_SERVER['HTTP_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_FORWARDED_FOR'];
        } elseif (!empty($_SERVER['HTTP_FORWARDED'])) {
            $ip = $_SERVER['HTTP_FORWARDED'];
        } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        
        return self::sanitizeInput($ip);
    }

    /**
     * Validate URL
     */
    public static function validateUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * Set security headers for HTTP responses
     */
    public static function setSecurityHeaders(): void
    {
        if (headers_sent()) {
            return;
        }

        // Content Security Policy
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");
        
        // XSS Protection
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        
        // Strict Transport Security (HTTPS only)
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
        
        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        // Permissions Policy
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    }

    /**
     * Generate secure file name
     */
    public static function generateSecureFileName(string $originalName): string
    {
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        
        // Sanitize base name
        $baseName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName);
        $baseName = substr($baseName, 0, 100);
        
        // Add random component
        $random = self::generateRandomToken(16);
        
        return $baseName . '_' . $random . '.' . $extension;
    }

    /**
     * Validate file upload
     */
    public static function validateFileUpload(array $file, array $allowedTypes = null, int $maxSize = null): array
    {
        $errors = [];
        
        $allowedTypes = $allowedTypes ?? Settings::getFileUploadConfig()['allowed_types'];
        $maxSize = $maxSize ?? Settings::getFileUploadConfig()['max_size'];

        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors[] = self::getUploadErrorMessage($file['error']);
        }

        // Check file size
        if ($file['size'] > $maxSize) {
            $errors[] = 'File size exceeds maximum allowed size of ' . round($maxSize / 1024 / 1024, 2) . 'MB';
        }

        // Check file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            $errors[] = 'File type not allowed. Allowed types: ' . implode(', ', $allowedTypes);
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'mime_type' => $mimeType
        ];
    }

    /**
     * Get upload error message
     */
    private static function getUploadErrorMessage(int $errorCode): string
    {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
            UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form',
            UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload',
        ];

        return $errors[$errorCode] ?? 'Unknown upload error';
    }

    /**
     * Rate limiting check
     */
    public static function checkRateLimit(string $identifier, int $maxRequests = null, int $period = null): array
    {
        $rateConfig = Settings::getRateLimitConfig();
        $maxRequests = $maxRequests ?? $rateConfig['requests'];
        $period = $period ?? $rateConfig['period'];

        $key = 'rate_limit_' . md5($identifier);
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $now = time();
        $windowStart = $now - $period;

        // Initialize or get existing data
        if (!isset($_SESSION[$key]) || !is_array($_SESSION[$key])) {
            $_SESSION[$key] = [];
        }

        // Remove old requests
        $_SESSION[$key] = array_filter($_SESSION[$key], function($timestamp) use ($windowStart) {
            return $timestamp > $windowStart;
        });

        // Check if limit exceeded
        if (count($_SESSION[$key]) >= $maxRequests) {
            return [
                'allowed' => false,
                'remaining' => 0,
                'reset_time' => min($_SESSION[$key]) + $period
            ];
        }

        // Add current request
        $_SESSION[$key][] = $now;

        return [
            'allowed' => true,
            'remaining' => $maxRequests - count($_SESSION[$key]),
            'reset_time' => $now + $period
        ];
    }

    /**
     * Check if security is initialized
     */
    private static function checkInitialized(): void
    {
        if (!self::$initialized) {
            throw new Exception('Security not initialized. Call Security::initialize() first.');
        }
    }
}