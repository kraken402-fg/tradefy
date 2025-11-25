<?php

namespace Tradefy\Utils;

use Exception;

class Validators
{
    /**
     * Validate email format
     */
    public static function validateEmail(string $email): array
    {
        $errors = [];

        if (empty($email)) {
            $errors[] = 'Email is required';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format';
        } elseif (strlen($email) > 255) {
            $errors[] = 'Email must not exceed 255 characters';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'value' => $email
        ];
    }

    /**
     * Validate password strength
     */
    public static function validatePassword(string $password): array
    {
        $errors = [];

        if (empty($password)) {
            $errors[] = 'Password is required';
        } else {
            if (strlen($password) < 8) {
                $errors[] = 'Password must be at least 8 characters long';
            }
            if (!preg_match('/[A-Z]/', $password)) {
                $errors[] = 'Password must contain at least one uppercase letter';
            }
            if (!preg_match('/[a-z]/', $password)) {
                $errors[] = 'Password must contain at least one lowercase letter';
            }
            if (!preg_match('/[0-9]/', $password)) {
                $errors[] = 'Password must contain at least one number';
            }
            if (!preg_match('/[!@#$%^&*()\-_=+{};:,<.>]/', $password)) {
                $errors[] = 'Password must contain at least one special character';
            }
            if (strlen($password) > 128) {
                $errors[] = 'Password must not exceed 128 characters';
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'value' => $password
        ];
    }

    /**
     * Validate product data
     */
    public static function validateProduct(array $productData): array
    {
        $errors = [];
        $sanitized = [];

        // Required fields
        $required = ['name', 'price'];
        foreach ($required as $field) {
            if (empty($productData[$field])) {
                $errors[] = "Field {$field} is required";
            }
        }

        // Name validation
        if (!empty($productData['name'])) {
            $name = Security::sanitizeInput($productData['name']);
            if (strlen($name) < 2) {
                $errors[] = 'Product name must be at least 2 characters long';
            } elseif (strlen($name) > 255) {
                $errors[] = 'Product name must not exceed 255 characters';
            } else {
                $sanitized['name'] = $name;
            }
        }

        // Description validation
        if (isset($productData['description'])) {
            $description = Security::sanitizeInput($productData['description']);
            if (strlen($description) > 2000) {
                $errors[] = 'Product description must not exceed 2000 characters';
            } else {
                $sanitized['description'] = $description;
            }
        }

        // Price validation
        if (isset($productData['price'])) {
            $price = filter_var($productData['price'], FILTER_VALIDATE_FLOAT);
            if ($price === false || $price <= 0) {
                $errors[] = 'Price must be a positive number';
            } else {
                $minPrice = \Tradefy\Config\Settings::getMinProductPrice();
                $maxPrice = \Tradefy\Config\Settings::getMaxProductPrice();
                
                if ($price < $minPrice || $price > $maxPrice) {
                    $errors[] = "Price must be between {$minPrice} and {$maxPrice}";
                } else {
                    $sanitized['price'] = round($price, 2);
                }
            }
        }

        // Currency validation
        if (isset($productData['currency'])) {
            $allowedCurrencies = ['USD', 'EUR', 'GBP', 'XOF', 'XAF'];
            $currency = strtoupper(Security::sanitizeInput($productData['currency']));
            
            if (!in_array($currency, $allowedCurrencies)) {
                $errors[] = 'Invalid currency. Allowed: ' . implode(', ', $allowedCurrencies);
            } else {
                $sanitized['currency'] = $currency;
            }
        }

        // Category validation
        if (isset($productData['category'])) {
            $category = Security::sanitizeInput($productData['category']);
            if (strlen($category) > 100) {
                $errors[] = 'Category must not exceed 100 characters';
            } else {
                $sanitized['category'] = $category;
            }
        }

        // Tags validation
        if (isset($productData['tags']) && is_array($productData['tags'])) {
            $sanitizedTags = [];
            foreach ($productData['tags'] as $tag) {
                $sanitizedTag = Security::sanitizeInput($tag);
                if (!empty($sanitizedTag) && strlen($sanitizedTag) <= 50) {
                    $sanitizedTags[] = $sanitizedTag;
                }
            }
            $sanitized['tags'] = array_slice($sanitizedTags, 0, 20); // Limit to 20 tags
        }

        // Stock quantity validation
        if (isset($productData['stock_quantity'])) {
            $stock = filter_var($productData['stock_quantity'], FILTER_VALIDATE_INT);
            if ($stock === false || $stock < 0) {
                $errors[] = 'Stock quantity must be a non-negative integer';
            } else {
                $sanitized['stock_quantity'] = $stock;
            }
        }

        // Digital product validation
        if (isset($productData['is_digital'])) {
            $isDigital = filter_var($productData['is_digital'], FILTER_VALIDATE_BOOLEAN);
            $sanitized['is_digital'] = $isDigital;

            // Digital products require file_url
            if ($isDigital && empty($productData['file_url'])) {
                $errors[] = 'Digital products must have a file URL';
            }
        }

        // File URL validation for digital products
        if (isset($productData['file_url']) && !empty($productData['file_url'])) {
            $fileUrl = Security::sanitizeInput($productData['file_url']);
            if (!filter_var($fileUrl, FILTER_VALIDATE_URL)) {
                $errors[] = 'File URL must be a valid URL';
            } else {
                $sanitized['file_url'] = $fileUrl;
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $sanitized
        ];
    }

    /**
     * Validate order data
     */
    public static function validateOrder(array $orderData): array
    {
        $errors = [];
        $sanitized = [];

        // Required fields
        $required = ['product_id', 'quantity'];
        foreach ($required as $field) {
            if (empty($orderData[$field])) {
                $errors[] = "Field {$field} is required";
            }
        }

        // Product ID validation
        if (isset($orderData['product_id'])) {
            $productId = filter_var($orderData['product_id'], FILTER_VALIDATE_INT);
            if ($productId === false || $productId <= 0) {
                $errors[] = 'Product ID must be a positive integer';
            } else {
                $sanitized['product_id'] = $productId;
            }
        }

        // Quantity validation
        if (isset($orderData['quantity'])) {
            $quantity = filter_var($orderData['quantity'], FILTER_VALIDATE_INT);
            if ($quantity === false || $quantity <= 0) {
                $errors[] = 'Quantity must be a positive integer';
            } elseif ($quantity > 1000) {
                $errors[] = 'Quantity must not exceed 1000';
            } else {
                $sanitized['quantity'] = $quantity;
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $sanitized
        ];
    }

    /**
     * Validate user profile data
     */
    public static function validateProfile(array $profileData): array
    {
        $errors = [];
        $sanitized = [];

        // Store name validation (for vendors)
        if (isset($profileData['store_name'])) {
            $storeName = Security::sanitizeInput($profileData['store_name']);
            if (strlen($storeName) < 2) {
                $errors[] = 'Store name must be at least 2 characters long';
            } elseif (strlen($storeName) > 100) {
                $errors[] = 'Store name must not exceed 100 characters';
            } else {
                $sanitized['store_name'] = $storeName;
            }
        }

        // First name validation
        if (isset($profileData['first_name'])) {
            $firstName = Security::sanitizeInput($profileData['first_name']);
            if (strlen($firstName) > 50) {
                $errors[] = 'First name must not exceed 50 characters';
            } else {
                $sanitized['first_name'] = $firstName;
            }
        }

        // Last name validation
        if (isset($profileData['last_name'])) {
            $lastName = Security::sanitizeInput($profileData['last_name']);
            if (strlen($lastName) > 50) {
                $errors[] = 'Last name must not exceed 50 characters';
            } else {
                $sanitized['last_name'] = $lastName;
            }
        }

        // Phone validation
        if (isset($profileData['phone'])) {
            $phone = Security::sanitizeInput($profileData['phone']);
            if (!preg_match('/^[\+]?[0-9\s\-\(\)]{10,20}$/', $phone)) {
                $errors[] = 'Invalid phone number format';
            } else {
                $sanitized['phone'] = $phone;
            }
        }

        // Description validation
        if (isset($profileData['description'])) {
            $description = Security::sanitizeInput($profileData['description']);
            if (strlen($description) > 1000) {
                $errors[] = 'Description must not exceed 1000 characters';
            } else {
                $sanitized['description'] = $description;
            }
        }

        // Social links validation
        if (isset($profileData['social_links']) && is_array($profileData['social_links'])) {
            $sanitizedSocial = [];
            $allowedPlatforms = ['website', 'twitter', 'facebook', 'instagram', 'linkedin'];
            
            foreach ($profileData['social_links'] as $platform => $url) {
                if (in_array($platform, $allowedPlatforms)) {
                    $sanitizedUrl = Security::sanitizeInput($url);
                    if (filter_var($sanitizedUrl, FILTER_VALIDATE_URL)) {
                        $sanitizedSocial[$platform] = $sanitizedUrl;
                    }
                }
            }
            $sanitized['social_links'] = $sanitizedSocial;
        }

        // Address validation
        if (isset($profileData['address']) && is_array($profileData['address'])) {
            $sanitizedAddress = [];
            $addressFields = ['street', 'city', 'state', 'country', 'zip_code'];
            
            foreach ($addressFields as $field) {
                if (isset($profileData['address'][$field])) {
                    $value = Security::sanitizeInput($profileData['address'][$field]);
                    if (strlen($value) <= 100) {
                        $sanitizedAddress[$field] = $value;
                    }
                }
            }
            $sanitized['address'] = $sanitizedAddress;
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $sanitized
        ];
    }

    /**
     * Validate integration configuration
     */
    public static function validateIntegration(array $integrationData): array
    {
        $errors = [];
        $sanitized = [];

        // Required fields
        $required = ['type', 'name', 'config'];
        foreach ($required as $field) {
            if (empty($integrationData[$field])) {
                $errors[] = "Field {$field} is required";
            }
        }

        // Type validation
        if (isset($integrationData['type'])) {
            $allowedTypes = ['email', 'analytics', 'crm', 'payment', 'shipping', 'custom'];
            $type = Security::sanitizeInput($integrationData['type']);
            
            if (!in_array($type, $allowedTypes)) {
                $errors[] = 'Invalid integration type. Allowed: ' . implode(', ', $allowedTypes);
            } else {
                $sanitized['type'] = $type;
            }
        }

        // Name validation
        if (isset($integrationData['name'])) {
            $name = Security::sanitizeInput($integrationData['name']);
            if (strlen($name) < 2) {
                $errors[] = 'Integration name must be at least 2 characters long';
            } elseif (strlen($name) > 255) {
                $errors[] = 'Integration name must not exceed 255 characters';
            } else {
                $sanitized['name'] = $name;
            }
        }

        // Config validation
        if (isset($integrationData['config']) && is_array($integrationData['config'])) {
            $sanitizedConfig = [];
            
            foreach ($integrationData['config'] as $key => $value) {
                $sanitizedKey = Security::sanitizeInput($key);
                if (is_string($value)) {
                    $sanitizedConfig[$sanitizedKey] = Security::sanitizeInput($value);
                } elseif (is_array($value)) {
                    $sanitizedConfig[$sanitizedKey] = Security::sanitizeInput($value);
                } else {
                    $sanitizedConfig[$sanitizedKey] = $value;
                }
            }
            $sanitized['config'] = $sanitizedConfig;
        }

        // Active status validation
        if (isset($integrationData['is_active'])) {
            $isActive = filter_var($integrationData['is_active'], FILTER_VALIDATE_BOOLEAN);
            $sanitized['is_active'] = $isActive;
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $sanitized
        ];
    }

    /**
     * Validate file upload
     */
    public static function validateFileUpload(array $file, array $allowedTypes = null, int $maxSize = null): array
    {
        $errors = [];

        if (empty($file) || $file['error'] !== UPLOAD_ERR_OK) {
            $errors[] = 'File upload failed';
            return [
                'valid' => false,
                'errors' => $errors
            ];
        }

        // Use default settings if not provided
        if ($allowedTypes === null) {
            $allowedTypes = \Tradefy\Config\Settings::getFileUploadConfig()['allowed_types'];
        }
        
        if ($maxSize === null) {
            $maxSize = \Tradefy\Config\Settings::getFileUploadConfig()['max_size'];
        }

        // File size validation
        if ($file['size'] > $maxSize) {
            $maxSizeMB = round($maxSize / 1024 / 1024, 1);
            $errors[] = "File size must not exceed {$maxSizeMB}MB";
        }

        // File type validation
        $fileType = mime_content_type($file['tmp_name']);
        if (!in_array($fileType, $allowedTypes)) {
            $errors[] = 'Invalid file type. Allowed types: ' . implode(', ', $allowedTypes);
        }

        // File name validation
        $fileName = Security::sanitizeInput($file['name']);
        if (strlen($fileName) > 255) {
            $errors[] = 'File name must not exceed 255 characters';
        }

        // Check for potentially dangerous file types
        $dangerousExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'html', 'htm', 'js'];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if (in_array($fileExtension, $dangerousExtensions)) {
            $errors[] = 'File type not allowed for security reasons';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'file_type' => $fileType,
            'file_size' => $file['size'],
            'file_name' => $fileName
        ];
    }

    /**
     * Validate base64 image data
     */
    public static function validateBase64Image(string $base64Data, array $allowedTypes = null, int $maxSize = null): array
    {
        $errors = [];

        // Use default settings if not provided
        if ($allowedTypes === null) {
            $allowedTypes = \Tradefy\Config\Settings::getFileUploadConfig()['allowed_types'];
        }
        
        if ($maxSize === null) {
            $maxSize = \Tradefy\Config\Settings::getFileUploadConfig()['max_size'];
        }

        // Extract base64 data
        if (strpos($base64Data, 'base64,') !== false) {
            $parts = explode('base64,', $base64Data);
            $base64Data = $parts[1];
        }

        // Decode and validate base64
        $imageData = base64_decode($base64Data, true);
        if ($imageData === false) {
            $errors[] = 'Invalid base64 image data';
            return [
                'valid' => false,
                'errors' => $errors
            ];
        }

        // Size validation
        $dataSize = strlen($imageData);
        if ($dataSize > $maxSize) {
            $maxSizeMB = round($maxSize / 1024 / 1024, 1);
            $errors[] = "Image size must not exceed {$maxSizeMB}MB";
        }

        // Type validation using finfo
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_buffer($finfo, $imageData);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            $errors[] = 'Invalid image type. Allowed types: ' . implode(', ', $allowedTypes);
        }

        // Additional image validation
        $image = @imagecreatefromstring($imageData);
        if ($image === false) {
            $errors[] = 'Invalid image data';
        } else {
            imagedestroy($image);
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'mime_type' => $mimeType,
            'data_size' => $dataSize,
            'image_data' => $imageData
        ];
    }

    /**
     * Validate numeric range
     */
    public static function validateNumericRange($value, float $min = null, float $max = null): array
    {
        $errors = [];

        if (!is_numeric($value)) {
            $errors[] = 'Value must be numeric';
            return [
                'valid' => false,
                'errors' => $errors
            ];
        }

        $numericValue = floatval($value);

        if ($min !== null && $numericValue < $min) {
            $errors[] = "Value must be at least {$min}";
        }

        if ($max !== null && $numericValue > $max) {
            $errors[] = "Value must not exceed {$max}";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'value' => $numericValue
        ];
    }

    /**
     * Validate string length
     */
    public static function validateStringLength(string $value, int $min = null, int $max = null): array
    {
        $errors = [];
        $length = strlen($value);

        if ($min !== null && $length < $min) {
            $errors[] = "Text must be at least {$min} characters long";
        }

        if ($max !== null && $length > $max) {
            $errors[] = "Text must not exceed {$max} characters";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'length' => $length,
            'value' => $value
        ];
    }

    /**
     * Validate URL
     */
    public static function validateUrl(string $url): array
    {
        $errors = [];

        if (empty($url)) {
            $errors[] = 'URL is required';
        } elseif (!filter_var($url, FILTER_VALIDATE_URL)) {
            $errors[] = 'Invalid URL format';
        } elseif (strlen($url) > 2000) {
            $errors[] = 'URL must not exceed 2000 characters';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'value' => $url
        ];
    }

    /**
     * Validate commission rate (in basis points)
     */
    public static function validateCommissionRate(int $rate): array
    {
        $errors = [];

        if ($rate < 0 || $rate > 1000) {
            $errors[] = 'Commission rate must be between 0 and 1000 basis points';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'value' => $rate
        ];
    }

    /**
     * Validate sales count for rank calculation
     */
    public static function validateSalesCount(int $salesCount): array
    {
        $errors = [];

        if ($salesCount < 0) {
            $errors[] = 'Sales count cannot be negative';
        }

        if ($salesCount > 1000000) {
            $errors[] = 'Sales count is unrealistically high';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'value' => $salesCount
        ];
    }

    /**
     * Validate rating (1-5 stars)
     */
    public static function validateRating($rating): array
    {
        $errors = [];

        $numericRating = filter_var($rating, FILTER_VALIDATE_INT);
        if ($numericRating === false || $numericRating < 1 || $numericRating > 5) {
            $errors[] = 'Rating must be an integer between 1 and 5';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'value' => $numericRating
        ];
    }

    /**
     * Validate pagination parameters
     */
    public static function validatePagination(int $page, int $perPage): array
    {
        $errors = [];

        if ($page < 1) {
            $errors[] = 'Page must be at least 1';
        }

        if ($perPage < 1 || $perPage > 100) {
            $errors[] = 'Items per page must be between 1 and 100';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'page' => max(1, $page),
            'per_page' => min(max(1, $perPage), 100)
        ];
    }

    /**
     * Validate search filters
     */
    public static function validateSearchFilters(array $filters): array
    {
        $errors = [];
        $sanitized = [];

        $allowedFilters = [
            'query' => 'string',
            'category' => 'string', 
            'vendor_id' => 'integer',
            'min_price' => 'float',
            'max_price' => 'float',
            'is_digital' => 'boolean',
            'tags' => 'array'
        ];

        foreach ($filters as $key => $value) {
            if (array_key_exists($key, $allowedFilters)) {
                $type = $allowedFilters[$key];
                
                switch ($type) {
                    case 'string':
                        $sanitized[$key] = Security::sanitizeInput($value);
                        break;
                    case 'integer':
                        $intValue = filter_var($value, FILTER_VALIDATE_INT);
                        if ($intValue !== false) {
                            $sanitized[$key] = $intValue;
                        }
                        break;
                    case 'float':
                        $floatValue = filter_var($value, FILTER_VALIDATE_FLOAT);
                        if ($floatValue !== false) {
                            $sanitized[$key] = $floatValue;
                        }
                        break;
                    case 'boolean':
                        $sanitized[$key] = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                        break;
                    case 'array':
                        if (is_array($value)) {
                            $sanitized[$key] = array_map([Security::class, 'sanitizeInput'], $value);
                        }
                        break;
                }
            }
        }

        // Validate price range
        if (isset($sanitized['min_price']) && isset($sanitized['max_price'])) {
            if ($sanitized['min_price'] > $sanitized['max_price']) {
                $errors[] = 'Minimum price cannot be greater than maximum price';
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $sanitized
        ];
    }

    /**
     * Batch validate multiple fields
     */
    public static function batchValidate(array $validations): array
    {
        $results = [];
        $allValid = true;
        $allErrors = [];

        foreach ($validations as $field => $validationConfig) {
            $validator = $validationConfig['validator'];
            $value = $validationConfig['value'];
            $params = $validationConfig['params'] ?? [];

            if (method_exists(self::class, $validator)) {
                $result = call_user_func_array([self::class, $validator], array_merge([$value], $params));
                $results[$field] = $result;
                
                if (!$result['valid']) {
                    $allValid = false;
                    $allErrors[$field] = $result['errors'];
                }
            } else {
                throw new Exception("Validator method {$validator} does not exist");
            }
        }

        return [
            'valid' => $allValid,
            'results' => $results,
            'errors' => $allErrors
        ];
    }
}