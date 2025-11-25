<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Utils\Validators;

class ValidatorsTest extends TestCase
{
    public function testValidateEmail()
    {
        // Valid emails
        $result = Validators::validateEmail('test@example.com');
        $this->assertTrue($result['valid']);
        
        $result = Validators::validateEmail('user.name+tag@domain.co.uk');
        $this->assertTrue($result['valid']);

        // Invalid emails
        $result = Validators::validateEmail('invalid-email');
        $this->assertFalse($result['valid']);
        $this->assertContains('Invalid email format', $result['errors']);

        $result = Validators::validateEmail('');
        $this->assertFalse($result['valid']);
        $this->assertContains('Email is required', $result['errors']);
    }

    public function testValidatePassword()
    {
        // Valid password
        $result = Validators::validatePassword('SecurePass123!');
        $this->assertTrue($result['valid']);

        // Too short
        $result = Validators::validatePassword('Short1!');
        $this->assertFalse($result['valid']);
        $this->assertContains('at least 8 characters', $result['errors']);

        // No uppercase
        $result = Validators::validatePassword('nopass123!');
        $this->assertFalse($result['valid']);
        $this->assertContains('uppercase letter', $result['errors']);

        // No lowercase
        $result = Validators::validatePassword('NOPASS123!');
        $this->assertFalse($result['valid']);
        $this->assertContains('lowercase letter', $result['errors']);

        // No number
        $result = Validators::validatePassword('NoSpecialPass!');
        $this->assertFalse($result['valid']);
        $this->assertContains('number', $result['errors']);

        // No special character
        $result = Validators::validatePassword('NoSpecial123');
        $this->assertFalse($result['valid']);
        $this->assertContains('special character', $result['errors']);
    }

    public function testValidateProduct()
    {
        // Valid product
        $productData = [
            'name' => 'Test Product',
            'price' => 99.99,
            'description' => 'Test description',
            'currency' => 'USD',
            'category' => 'electronics',
            'tags' => ['new', 'featured'],
            'stock_quantity' => 10
        ];

        $result = Validators::validateProduct($productData);
        $this->assertTrue($result['valid']);
        $this->assertEquals('Test Product', $result['sanitized']['name']);
        $this->assertEquals(99.99, $result['sanitized']['price']);

        // Invalid product - missing required fields
        $result = Validators::validateProduct(['description' => 'Test']);
        $this->assertFalse($result['valid']);
        $this->assertContains('name is required', $result['errors']);

        // Invalid price
        $result = Validators::validateProduct(['name' => 'Test', 'price' => -10]);
        $this->assertFalse($result['valid']);
        $this->assertContains('positive number', $result['errors']);

        // Invalid currency
        $result = Validators::validateProduct([
            'name' => 'Test', 
            'price' => 10, 
            'currency' => 'INVALID'
        ]);
        $this->assertFalse($result['valid']);
        $this->assertContains('Invalid currency', $result['errors']);
    }

    public function testValidateOrder()
    {
        // Valid order
        $orderData = [
            'product_id' => 123,
            'quantity' => 2
        ];

        $result = Validators::validateOrder($orderData);
        $this->assertTrue($result['valid']);

        // Invalid order - missing fields
        $result = Validators::validateOrder(['product_id' => 123]);
        $this->assertFalse($result['valid']);
        $this->assertContains('quantity is required', $result['errors']);

        // Invalid quantity
        $result = Validators::validateOrder([
            'product_id' => 123,
            'quantity' => 0
        ]);
        $this->assertFalse($result['valid']);
        $this->assertContains('positive integer', $result['errors']);
    }

    public function testValidateProfile()
    {
        // Valid profile
        $profileData = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '+1234567890',
            'store_name' => 'My Store',
            'description' => 'Test description',
            'social_links' => [
                'website' => 'https://example.com',
                'twitter' => 'https://twitter.com/example'
            ]
        ];

        $result = Validators::validateProfile($profileData);
        $this->assertTrue($result['valid']);

        // Invalid phone
        $result = Validators::validateProfile(['phone' => 'invalid']);
        $this->assertFalse($result['valid']);
        $this->assertContains('phone number format', $result['errors']);

        // Too long store name
        $result = Validators::validateProfile([
            'store_name' => str_repeat('a', 101)
        ]);
        $this->assertFalse($result['valid']);
        $this->assertContains('exceed 100 characters', $result['errors']);
    }

    public function testValidateIntegration()
    {
        // Valid integration
        $integrationData = [
            'type' => 'email',
            'name' => 'My Email Service',
            'config' => [
                'smtp_host' => 'smtp.example.com',
                'smtp_port' => 587
            ]
        ];

        $result = Validators::validateIntegration($integrationData);
        $this->assertTrue($result['valid']);

        // Invalid type
        $result = Validators::validateIntegration([
            'type' => 'invalid',
            'name' => 'Test',
            'config' => []
        ]);
        $this->assertFalse($result['valid']);
        $this->assertContains('Invalid integration type', $result['errors']);
    }

    public function testValidateNumericRange()
    {
        $result = Validators::validateNumericRange(5, 1, 10);
        $this->assertTrue($result['valid']);

        $result = Validators::validateNumericRange(15, 1, 10);
        $this->assertFalse($result['valid']);
        $this->assertContains('not exceed 10', $result['errors']);

        $result = Validators::validateNumericRange(0, 1, 10);
        $this->assertFalse($result['valid']);
        $this->assertContains('at least 1', $result['errors']);
    }

    public function testValidateStringLength()
    {
        $result = Validators::validateStringLength('Hello', 1, 10);
        $this->assertTrue($result['valid']);

        $result = Validators::validateStringLength('', 1, 10);
        $this->assertFalse($result['valid']);
        $this->assertContains('at least 1', $result['errors']);

        $result = Validators::validateStringLength('This is too long', 1, 5);
        $this->assertFalse($result['valid']);
        $this->assertContains('not exceed 5', $result['errors']);
    }

    public function testValidateRating()
    {
        for ($i = 1; $i <= 5; $i++) {
            $result = Validators::validateRating($i);
            $this->assertTrue($result['valid']);
        }

        $result = Validators::validateRating(0);
        $this->assertFalse($result['valid']);

        $result = Validators::validateRating(6);
        $this->assertFalse($result['valid']);

        $result = Validators::validateRating('invalid');
        $this->assertFalse($result['valid']);
    }

    public function testValidatePagination()
    {
        $result = Validators::validatePagination(1, 20);
        $this->assertTrue($result['valid']);

        $result = Validators::validatePagination(0, 20);
        $this->assertFalse($result['valid']);

        $result = Validators::validatePagination(1, 0);
        $this->assertFalse($result['valid']);

        $result = Validators::validatePagination(1, 150);
        $this->assertFalse($result['valid']);
    }

    public function testBatchValidate()
    {
        $validations = [
            'email' => [
                'validator' => 'validateEmail',
                'value' => 'test@example.com'
            ],
            'password' => [
                'validator' => 'validatePassword', 
                'value' => 'SecurePass123!'
            ],
            'age' => [
                'validator' => 'validateNumericRange',
                'value' => 25,
                'params' => [18, 100]
            ]
        ];

        $result = Validators::batchValidate($validations);
        $this->assertTrue($result['valid']);
        $this->assertCount(3, $result['results']);
    }
}