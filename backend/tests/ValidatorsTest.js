const Validators = require('../utils/Validators');

/**
 * Tests pour Validators
 */
class ValidatorsTest {
    constructor() {
        this.validators = new Validators();
        this.testResults = [];
    }

    /**
     * Test validation email valide
     */
    testValidEmail() {
        try {
            console.log('🧪 Test: Validation email valide...');

            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org',
                'user123@test-domain.com'
            ];

            validEmails.forEach(email => {
                const result = this.validators.validateEmail(email);
                this.assert(result.valid === true, `${email} devrait être valide`);
            });

            this.addTestResult('Validation email valide', true);
            console.log('✅ Test validation email valide réussi');

        } catch (error) {
            this.addTestResult('Validation email valide', false, error.message);
            console.error('❌ Test validation email valide échoué:', error.message);
        }
    }

    /**
     * Test validation email invalide
     */
    testInvalidEmail() {
        try {
            console.log('🧪 Test: Validation email invalide...');

            const invalidEmails = [
                'invalid-email',
                '@example.com',
                'user@',
                'user..name@example.com',
                'user@.com',
                '',
                null,
                undefined
            ];

            invalidEmails.forEach(email => {
                const result = this.validators.validateEmail(email);
                this.assert(result.valid === false, `${email} devrait être invalide`);
            });

            this.addTestResult('Validation email invalide', true);
            console.log('✅ Test validation email invalide réussi');

        } catch (error) {
            this.addTestResult('Validation email invalide', false, error.message);
            console.error('❌ Test validation email invalide échoué:', error.message);
        }
    }

    /**
     * Test validation mot de passe valide
     */
    testValidPassword() {
        try {
            console.log('🧪 Test: Validation mot de passe valide...');

            const validPasswords = [
                'Password123!',
                'MySecure@Pass1',
                'StrongP@ssw0rd',
                'Complex#Password2'
            ];

            validPasswords.forEach(password => {
                const result = this.validators.validatePassword(password);
                this.assert(result.valid === true, `${password} devrait être valide`);
            });

            this.addTestResult('Validation mot de passe valide', true);
            console.log('✅ Test validation mot de passe valide réussi');

        } catch (error) {
            this.addTestResult('Validation mot de passe valide', false, error.message);
            console.error('❌ Test validation mot de passe valide échoué:', error.message);
        }
    }

    /**
     * Test validation mot de passe invalide
     */
    testInvalidPassword() {
        try {
            console.log('🧪 Test: Validation mot de passe invalide...');

            const invalidPasswords = [
                '123', // Trop court
                'password', // Pas de majuscule, chiffre, spécial
                'PASSWORD', // Pas de minuscule, chiffre, spécial
                '12345678', // Pas de majuscule, minuscule, spécial
                'Password', // Pas de chiffre, spécial
                'Password123', // Pas de caractère spécial
                '',
                null,
                undefined
            ];

            invalidPasswords.forEach(password => {
                const result = this.validators.validatePassword(password);
                this.assert(result.valid === false, `${password} devrait être invalide`);
            });

            this.addTestResult('Validation mot de passe invalide', true);
            console.log('✅ Test validation mot de passe invalide réussi');

        } catch (error) {
            this.addTestResult('Validation mot de passe invalide', false, error.message);
            console.error('❌ Test validation mot de passe invalide échoué:', error.message);
        }
    }

    /**
     * Test validation username valide
     */
    testValidUsername() {
        try {
            console.log('🧪 Test: Validation username valide...');

            const validUsernames = [
                'testuser',
                'user123',
                'test_user',
                'user_name_123',
                'a' // Minimum 3 caractères, donc ceci devrait échouer
            ];

            // Test avec usernames valides (3+ caractères)
            const validUsernamesCorrect = validUsernames.filter(u => u.length >= 3);
            validUsernamesCorrect.forEach(username => {
                const result = this.validators.validateUsername(username);
                this.assert(result.valid === true, `${username} devrait être valide`);
            });

            this.addTestResult('Validation username valide', true);
            console.log('✅ Test validation username valide réussi');

        } catch (error) {
            this.addTestResult('Validation username valide', false, error.message);
            console.error('❌ Test validation username valide échoué:', error.message);
        }
    }

    /**
     * Test validation username invalide
     */
    testInvalidUsername() {
        try {
            console.log('🧪 Test: Validation username invalide...');

            const invalidUsernames = [
                'ab', // Trop court
                'a'.repeat(31), // Trop long
                'user@name', // Caractère spécial non autorisé
                'user-name', // Tiret non autorisé
                'user name', // Espace non autorisé
                '',
                null,
                undefined
            ];

            invalidUsernames.forEach(username => {
                const result = this.validators.validateUsername(username);
                this.assert(result.valid === false, `${username} devrait être invalide`);
            });

            this.addTestResult('Validation username invalide', true);
            console.log('✅ Test validation username invalide réussi');

        } catch (error) {
            this.addTestResult('Validation username invalide', false, error.message);
            console.error('❌ Test validation username invalide échoué:', error.message);
        }
    }

    /**
     * Test validation téléphone valide
     */
    testValidPhone() {
        try {
            console.log('🧪 Test: Validation téléphone valide...');

            const validPhones = [
                '+237123456789',
                '+33612345678',
                '+12125551234',
                '237123456789' // Sans + mais valide
            ];

            validPhones.forEach(phone => {
                const result = this.validators.validatePhone(phone);
                this.assert(result.valid === true, `${phone} devrait être valide`);
            });

            this.addTestResult('Validation téléphone valide', true);
            console.log('✅ Test validation téléphone valide réussi');

        } catch (error) {
            this.addTestResult('Validation téléphone valide', false, error.message);
            console.error('❌ Test validation téléphone valide échoué:', error.message);
        }
    }

    /**
     * Test validation téléphone invalide
     */
    testInvalidPhone() {
        try {
            console.log('🧪 Test: Validation téléphone invalide...');

            const invalidPhones = [
                '123', // Trop court
                '12345678901234567890', // Trop long
                'abc123456789', // Lettres
                '+1234567890a', // Lettre à la fin
                '',
                null,
                undefined
            ];

            invalidPhones.forEach(phone => {
                const result = this.validators.validatePhone(phone);
                this.assert(result.valid === false, `${phone} devrait être invalide`);
            });

            this.addTestResult('Validation téléphone invalide', true);
            console.log('✅ Test validation téléphone invalide réussi');

        } catch (error) {
            this.addTestResult('Validation téléphone invalide', false, error.message);
            console.error('❌ Test validation téléphone invalide échoué:', error.message);
        }
    }

    /**
     * Test validation montant valide
     */
    testValidAmount() {
        try {
            console.log('🧪 Test: Validation montant valide...');

            const validAmounts = [
                0,
                100,
                1000.50,
                9999999.99
            ];

            validAmounts.forEach(amount => {
                const result = this.validators.validateAmount(amount);
                this.assert(result.valid === true, `${amount} devrait être valide`);
            });

            this.addTestResult('Validation montant valide', true);
            console.log('✅ Test validation montant valide réussi');

        } catch (error) {
            this.addTestResult('Validation montant valide', false, error.message);
            console.error('❌ Test validation montant valide échoué:', error.message);
        }
    }

    /**
     * Test validation montant invalide
     */
    testInvalidAmount() {
        try {
            console.log('🧪 Test: Validation montant invalide...');

            const invalidAmounts = [
                -1,
                -100.50,
                10000001, // Trop grand
                'invalid',
                null,
                undefined,
                100.123 // Plus de 2 décimales
            ];

            invalidAmounts.forEach(amount => {
                const result = this.validators.validateAmount(amount);
                this.assert(result.valid === false, `${amount} devrait être invalide`);
            });

            this.addTestResult('Validation montant invalide', true);
            console.log('✅ Test validation montant invalide réussi');

        } catch (error) {
            this.addTestResult('Validation montant invalide', false, error.message);
            console.error('❌ Test validation montant invalide échoué:', error.message);
        }
    }

    /**
     * Test validation nom valide
     */
    testValidName() {
        try {
            console.log('🧪 Test: Validation nom valide...');

            const validNames = [
                'John Doe',
                'Jean-Marc',
                'Mary Anne',
                'O\'Connor',
                'Álvaro'
            ];

            validNames.forEach(name => {
                const result = this.validators.validateName(name);
                this.assert(result.valid === true, `${name} devrait être valide`);
            });

            this.addTestResult('Validation nom valide', true);
            console.log('✅ Test validation nom valide réussi');

        } catch (error) {
            this.addTestResult('Validation nom valide', false, error.message);
            console.error('❌ Test validation nom valide échoué:', error.message);
        }
    }

    /**
     * Test validation nom invalide
     */
    testInvalidName() {
        try {
            console.log('🧪 Test: Validation nom invalide...');

            const invalidNames = [
                'A', // Trop court
                'a'.repeat(101), // Trop long
                'John123', // Chiffres
                'John@Doe', // Caractère spécial
                '',
                null,
                undefined
            ];

            invalidNames.forEach(name => {
                const result = this.validators.validateName(name);
                this.assert(result.valid === false, `${name} devrait être invalide`);
            });

            this.addTestResult('Validation nom invalide', true);
            console.log('✅ Test validation nom invalide réussi');

        } catch (error) {
            this.addTestResult('Validation nom invalide', false, error.message);
            console.error('❌ Test validation nom invalide échoué:', error.message);
        }
    }

    /**
     * Test validation URL valide
     */
    testValidUrl() {
        try {
            console.log('🧪 Test: Validation URL valide...');

            const validUrls = [
                'https://example.com',
                'http://example.com',
                'https://www.example.com',
                'https://example.com/path',
                'https://example.com/path?query=value',
                'https://example.com:8080'
            ];

            validUrls.forEach(url => {
                const result = this.validators.validateUrl(url);
                this.assert(result.valid === true, `${url} devrait être valide`);
            });

            this.addTestResult('Validation URL valide', true);
            console.log('✅ Test validation URL valide réussi');

        } catch (error) {
            this.addTestResult('Validation URL valide', false, error.message);
            console.error('❌ Test validation URL valide échoué:', error.message);
        }
    }

    /**
     * Test validation URL invalide
     */
    testInvalidUrl() {
        try {
            console.log('🧪 Test: Validation URL invalide...');

            const invalidUrls = [
                'not-a-url',
                'ftp://example.com',
                '',
                null,
                undefined
            ];

            invalidUrls.forEach(url => {
                const result = this.validators.validateUrl(url);
                this.assert(result.valid === false, `${url} devrait être invalide`);
            });

            this.addTestResult('Validation URL invalide', true);
            console.log('✅ Test validation URL invalide réussi');

        } catch (error) {
            this.addTestResult('Validation URL invalide', false, error.message);
            console.error('❌ Test validation URL invalide échoué:', error.message);
        }
    }

    /**
     * Test validation UUID valide
     */
    testValidUUID() {
        try {
            console.log('🧪 Test: Validation UUID valide...');

            const validUUIDs = [
                '123e4567-e89b-12d3-a456-426614174000',
                '550e8400-e29b-41d4-a716-446655440000',
                '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
            ];

            validUUIDs.forEach(uuid => {
                const result = this.validators.validateUUID(uuid);
                this.assert(result.valid === true, `${uuid} devrait être valide`);
            });

            this.addTestResult('Validation UUID valide', true);
            console.log('✅ Test validation UUID valide réussi');

        } catch (error) {
            this.addTestResult('Validation UUID valide', false, error.message);
            console.error('❌ Test validation UUID valide échoué:', error.message);
        }
    }

    /**
     * Test validation UUID invalide
     */
    testInvalidUUID() {
        try {
            console.log('🧪 Test: Validation UUID invalide...');

            const invalidUUIDs = [
                'not-a-uuid',
                '123e4567-e89b-12d3-a456-42661417400', // Manque un caractère
                '123e4567-e89b-12d3-a456-4266141740000', // Trop long
                '',
                null,
                undefined
            ];

            invalidUUIDs.forEach(uuid => {
                const result = this.validators.validateUUID(uuid);
                this.assert(result.valid === false, `${uuid} devrait être invalide`);
            });

            this.addTestResult('Validation UUID invalide', true);
            console.log('✅ Test validation UUID invalide réussi');

        } catch (error) {
            this.addTestResult('Validation UUID invalide', false, error.message);
            console.error('❌ Test validation UUID invalide échoué:', error.message);
        }
    }

    /**
     * Test validation date valide
     */
    testValidDate() {
        try {
            console.log('🧪 Test: Validation date valide...');

            const validDates = [
                '2023-12-01',
                '2023-12-01T10:00:00Z',
                new Date(),
                '2023/12/01'
            ];

            validDates.forEach(date => {
                const result = this.validators.validateDate(date);
                this.assert(result.valid === true, `${date} devrait être valide`);
            });

            this.addTestResult('Validation date valide', true);
            console.log('✅ Test validation date valide réussi');

        } catch (error) {
            this.addTestResult('Validation date valide', false, error.message);
            console.error('❌ Test validation date valide échoué:', error.message);
        }
    }

    /**
     * Test validation date invalide
     */
    testInvalidDate() {
        try {
            console.log('🧪 Test: Validation date invalide...');

            const invalidDates = [
                'not-a-date',
                '2023-13-01', // Mois invalide
                '2023-02-30', // Jour invalide
                '',
                null,
                undefined
            ];

            invalidDates.forEach(date => {
                const result = this.validators.validateDate(date);
                this.assert(result.valid === false, `${date} devrait être invalide`);
            });

            this.addTestResult('Validation date invalide', true);
            console.log('✅ Test validation date invalide réussi');

        } catch (error) {
            this.addTestResult('Validation date invalide', false, error.message);
            console.error('❌ Test validation date invalide échoué:', error.message);
        }
    }

    /**
     * Test validation tableau valide
     */
    testValidArray() {
        try {
            console.log('🧪 Test: Validation tableau valide...');

            const validArrays = [
                [1, 2, 3],
                ['a', 'b', 'c'],
                [{}, {}],
                []
            ];

            validArrays.forEach(array => {
                const result = this.validators.validateArray(array);
                this.assert(result.valid === true, `${JSON.stringify(array)} devrait être valide`);
            });

            this.addTestResult('Validation tableau valide', true);
            console.log('✅ Test validation tableau valide réussi');

        } catch (error) {
            this.addTestResult('Validation tableau valide', false, error.message);
            console.error('❌ Test validation tableau valide échoué:', error.message);
        }
    }

    /**
     * Test validation tableau invalide
     */
    testInvalidArray() {
        try {
            console.log('🧪 Test: Validation tableau invalide...');

            const invalidArrays = [
                'not-an-array',
                123,
                {},
                null,
                undefined
            ];

            invalidArrays.forEach(array => {
                const result = this.validators.validateArray(array);
                this.assert(result.valid === false, `${array} devrait être invalide`);
            });

            this.addTestResult('Validation tableau invalide', true);
            console.log('✅ Test validation tableau invalide réussi');

        } catch (error) {
            this.addTestResult('Validation tableau invalide', false, error.message);
            console.error('❌ Test validation tableau invalide échoué:', error.message);
        }
    }

    /**
     * Test validation objet avec schéma
     */
    testValidateObjectWithSchema() {
        try {
            console.log('🧪 Test: Validation objet avec schéma...');

            const schema = {
                name: { required: true, type: 'string', minLength: 2 },
                age: { required: true, type: 'number', min: 0, max: 150 },
                email: { required: false, type: 'string', validate: this.validators.validateEmail.bind(this.validators) }
            };

            // Test objet valide
            const validObject = {
                name: 'John Doe',
                age: 30,
                email: 'john@example.com'
            };

            let result = this.validators.validateObject(validObject, schema);
            this.assert(result.valid === true, 'Objet valide devrait passer');

            // Test objet invalide (champ requis manquant)
            const invalidObject = {
                name: 'John'
                // age manquant
            };

            result = this.validators.validateObject(invalidObject, schema);
            this.assert(result.valid === false, 'Objet avec champ requis manquant devrait échouer');

            this.addTestResult('Validation objet avec schéma', true);
            console.log('✅ Test validation objet avec schéma réussi');

        } catch (error) {
            this.addTestResult('Validation objet avec schéma', false, error.message);
            console.error('❌ Test validation objet avec schéma échoué:', error.message);
        }
    }

    /**
     * Test données inscription
     */
    testValidateRegistration() {
        try {
            console.log('🧪 Test: Validation données inscription...');

            const validData = {
                email: 'test@example.com',
                password: 'Password123!',
                username: 'testuser',
                full_name: 'Test User',
                phone: '+237123456789'
            };

            let result = this.validators.validateRegistration(validData);
            this.assert(result.valid === true, 'Données inscription valides devraient passer');

            const invalidData = {
                email: 'invalid-email',
                password: '123',
                username: 'ab',
                full_name: 'A'
            };

            result = this.validators.validateRegistration(invalidData);
            this.assert(result.valid === false, 'Données inscription invalides devraient échouer');

            this.addTestResult('Validation données inscription', true);
            console.log('✅ Test validation données inscription réussi');

        } catch (error) {
            this.addTestResult('Validation données inscription', false, error.message);
            console.error('❌ Test validation données inscription échoué:', error.message);
        }
    }

    /**
     * Test nettoyage entrées
     */
    testSanitize() {
        try {
            console.log('🧪 Test: Nettoyage entrées...');

            // Test string
            let result = this.validators.sanitize('  test  ', 'string');
            this.assert(result === 'test', 'String devrait être trimmé');

            // Test number
            result = this.validators.sanitize('123.45', 'number');
            this.assert(result === 123.45, 'Number devrait être parsé');

            // Test integer
            result = this.validators.sanitize('123', 'integer');
            this.assert(result === 123, 'Integer devrait être parsé');

            // Test boolean
            result = this.validators.sanitize('true', 'boolean');
            this.assert(result === true, 'Boolean true devrait être parsé');

            result = this.validators.sanitize('false', 'boolean');
            this.assert(result === false, 'Boolean false devrait être parsé');

            // Test email
            result = this.validators.sanitize('Test@Example.COM', 'email');
            this.assert(result === 'test@example.com', 'Email devrait être normalisé');

            this.addTestResult('Nettoyage entrées', true);
            console.log('✅ Test nettoyage entrées réussi');

        } catch (error) {
            this.addTestResult('Nettoyage entrées', false, error.message);
            console.error('❌ Test nettoyage entrées échoué:', error.message);
        }
    }

    /**
     * Assertion helper
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    /**
     * Ajouter un résultat de test
     */
    addTestResult(testName, success, error = null) {
        this.testResults.push({
            test: testName,
            success: success,
            error: error,
            timestamp: new Date()
        });
    }

    /**
     * Exécuter tous les tests
     */
    runAllTests() {
        console.log('🚀 Démarrage des tests Validators...\n');

        const tests = [
            () => this.testValidEmail(),
            () => this.testInvalidEmail(),
            () => this.testValidPassword(),
            () => this.testInvalidPassword(),
            () => this.testValidUsername(),
            () => this.testInvalidUsername(),
            () => this.testValidPhone(),
            () => this.testInvalidPhone(),
            () => this.testValidAmount(),
            () => this.testInvalidAmount(),
            () => this.testValidName(),
            () => this.testInvalidName(),
            () => this.testValidUrl(),
            () => this.testInvalidUrl(),
            () => this.testValidUUID(),
            () => this.testInvalidUUID(),
            () => this.testValidDate(),
            () => this.testInvalidDate(),
            () => this.testValidArray(),
            () => this.testInvalidArray(),
            () => this.testValidateObjectWithSchema(),
            () => this.testValidateRegistration(),
            () => this.testSanitize()
        ];

        for (const test of tests) {
            try {
                test();
            } catch (error) {
                console.error('Erreur inattendue:', error.message);
            }
        }

        this.printResults();
    }

    /**
     * Afficher les résultats
     */
    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RÉSULTATS DES TESTS VALIDATORS');
        console.log('='.repeat(60));

        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;

        console.log(`✅ Tests réussis: ${successfulTests}/${totalTests}`);
        console.log(`❌ Tests échoués: ${failedTests}/${totalTests}`);

        if (failedTests > 0) {
            console.log('\n❌ Détails des échecs:');
            this.testResults
                .filter(r => !r.success)
                .forEach(result => {
                    console.log(`  - ${result.test}: ${result.error}`);
                });
        }

        console.log('='.repeat(60));
        console.log(`🎯 Taux de réussite: ${Math.round((successfulTests / totalTests) * 100)}%`);

        return {
            total: totalTests,
            successful: successfulTests,
            failed: failedTests,
            results: this.testResults
        };
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    const test = new ValidatorsTest();
    test.runAllTests();
}

module.exports = ValidatorsTest;
