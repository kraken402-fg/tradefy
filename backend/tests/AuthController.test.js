const AuthController = require('../controllers/AuthController');

describe('AuthController', () => {
    let authController;
    let mockDb;

    beforeEach(() => {
        mockDb = {
            query: jest.fn(),
            release: jest.fn()
        };
        authController = new AuthController(mockDb);
    });

    describe('validateRegistrationData', () => {
        it('should validate valid registration data', () => {
            const validData = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'Password123',
                full_name: 'Test User'
            };

            const result = authController.validateRegistrationData(validData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject invalid email', () => {
            const invalidData = {
                email: 'invalid-email',
                username: 'testuser',
                password: 'Password123'
            };

            const result = authController.validateRegistrationData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Email invalide');
        });

        it('should reject weak password', () => {
            const invalidData = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'weak'
            };

            const result = authController.validateRegistrationData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Le mot de passe doit contenir au moins 8 caractères');
        });

        it('should reject short username', () => {
            const invalidData = {
                email: 'test@example.com',
                username: 'ab',
                password: 'Password123'
            };

            const result = authController.validateRegistrationData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Le nom d\'utilisateur doit contenir au moins 3 caractères');
        });
    });

    describe('generateToken', () => {
        it('should generate a valid JWT token', () => {
            const user = {
                id: 1,
                email: 'test@example.com',
                role: 'vendor'
            };

            const token = authController.generateToken(user);
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });
    });

    describe('getNextRank', () => {
        it('should return next rank correctly', () => {
            expect(authController.getNextRank('profane')).toBe('debutant');
            expect(authController.getNextRank('debutant')).toBe('marchand');
            expect(authController.getNextRank('senior')).toBeNull();
        });
    });
});
