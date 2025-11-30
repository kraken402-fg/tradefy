const { config } = require('../config/platforms');

/**
 * Validation des entrées utilisateur
 */
class Validators {
    constructor() {
        this.rules = {
            email: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'L\'email doit être valide'
            },
            password: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial'
            },
            username: {
                minLength: 3,
                maxLength: 30,
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères alphanumériques et underscores'
            },
            phone: {
                pattern: /^\+?[1-9]\d{1,14}$/,
                message: 'Le numéro de téléphone doit être valide (format international)'
            },
            amount: {
                min: 0,
                max: 10000000,
                message: 'Le montant doit être entre 0 et 10,000,000'
            },
            name: {
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Z\s\-']+$/,
                message: 'Le nom doit contenir entre 2 et 100 caractères alphabétiques'
            },
            description: {
                maxLength: 2000,
                message: 'La description ne peut pas dépasser 2000 caractères'
            }
        };
    }

    /**
     * Valider un email
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, message: 'L\'email est requis' };
        }

        email = email.trim();
        
        if (!this.rules.email.pattern.test(email)) {
            return { valid: false, message: this.rules.email.message };
        }

        if (email.length > 254) {
            return { valid: false, message: 'L\'email est trop long' };
        }

        return { valid: true };
    }

    /**
     * Valider un mot de passe
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, message: 'Le mot de passe est requis' };
        }

        const rules = this.rules.password;

        // Longueur minimale
        if (password.length < rules.minLength) {
            return { valid: false, message: `Le mot de passe doit contenir au moins ${rules.minLength} caractères` };
        }

        // Majuscule
        if (rules.requireUppercase && !/[A-Z]/.test(password)) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
        }

        // Minuscule
        if (rules.requireLowercase && !/[a-z]/.test(password)) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
        }

        // Chiffres
        if (rules.requireNumbers && !/\d/.test(password)) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
        }

        // Caractères spéciaux
        if (rules.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins un caractère spécial' };
        }

        return { valid: true };
    }

    /**
     * Valider un nom d'utilisateur
     */
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, message: 'Le nom d\'utilisateur est requis' };
        }

        username = username.trim();
        const rules = this.rules.username;

        if (username.length < rules.minLength) {
            return { valid: false, message: `Le nom d\'utilisateur doit contenir au moins ${rules.minLength} caractères` };
        }

        if (username.length > rules.maxLength) {
            return { valid: false, message: `Le nom d\'utilisateur ne peut pas dépasser ${rules.maxLength} caractères` };
        }

        if (!rules.pattern.test(username)) {
            return { valid: false, message: rules.message };
        }

        return { valid: true };
    }

    /**
     * Valider un numéro de téléphone
     */
    validatePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return { valid: false, message: 'Le numéro de téléphone est requis' };
        }

        phone = phone.trim().replace(/\s+/g, '');

        if (!this.rules.phone.pattern.test(phone)) {
            return { valid: false, message: this.rules.phone.message };
        }

        return { valid: true };
    }

    /**
     * Valider un montant
     */
    validateAmount(amount) {
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount)) {
            return { valid: false, message: 'Le montant doit être un nombre' };
        }

        if (numAmount < this.rules.amount.min) {
            return { valid: false, message: `Le montant doit être supérieur à ${this.rules.amount.min}` };
        }

        if (numAmount > this.rules.amount.max) {
            return { valid: false, message: `Le montant ne peut pas dépasser ${this.rules.amount.max}` };
        }

        // Vérifier les décimales (max 2)
        const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
            return { valid: false, message: 'Le montant ne peut pas avoir plus de 2 décimales' };
        }

        return { valid: true };
    }

    /**
     * Valider un nom
     */
    validateName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: 'Le nom est requis' };
        }

        name = name.trim();
        const rules = this.rules.name;

        if (name.length < rules.minLength) {
            return { valid: false, message: `Le nom doit contenir au moins ${rules.minLength} caractères` };
        }

        if (name.length > rules.maxLength) {
            return { valid: false, message: `Le nom ne peut pas dépasser ${rules.maxLength} caractères` };
        }

        if (!rules.pattern.test(name)) {
            return { valid: false, message: rules.message };
        }

        return { valid: true };
    }

    /**
     * Valider une description
     */
    validateDescription(description) {
        if (!description) {
            return { valid: true }; // La description est optionnelle
        }

        if (typeof description !== 'string') {
            return { valid: false, message: 'La description doit être du texte' };
        }

        if (description.length > this.rules.description.maxLength) {
            return { valid: false, message: this.rules.description.message };
        }

        return { valid: true };
    }

    /**
     * Valider une URL
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, message: 'L\'URL est requise' };
        }

        try {
            new URL(url);
            return { valid: true };
        } catch (error) {
            return { valid: false, message: 'L\'URL doit être valide' };
        }
    }

    /**
     * Valider un UUID
     */
    validateUUID(uuid) {
        if (!uuid || typeof uuid !== 'string') {
            return { valid: false, message: 'L\'UUID est requis' };
        }

        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidPattern.test(uuid)) {
            return { valid: false, message: 'L\'UUID doit être valide' };
        }

        return { valid: true };
    }

    /**
     * Valider une date
     */
    validateDate(date, options = {}) {
        const { minDate, maxDate, allowPast = true, allowFuture = true } = options;

        if (!date) {
            return { valid: false, message: 'La date est requise' };
        }

        const parsedDate = new Date(date);

        if (isNaN(parsedDate.getTime())) {
            return { valid: false, message: 'La date doit être valide' };
        }

        const now = new Date();

        if (!allowPast && parsedDate < now) {
            return { valid: false, message: 'La date ne peut pas être dans le passé' };
        }

        if (!allowFuture && parsedDate > now) {
            return { valid: false, message: 'La date ne peut pas être dans le futur' };
        }

        if (minDate && parsedDate < new Date(minDate)) {
            return { valid: false, message: 'La date est trop ancienne' };
        }

        if (maxDate && parsedDate > new Date(maxDate)) {
            return { valid: false, message: 'La date est trop lointaine' };
        }

        return { valid: true };
    }

    /**
     * Valider un tableau
     */
    validateArray(array, options = {}) {
        const { minLength = 0, maxLength = Infinity, itemType = 'any' } = options;

        if (!Array.isArray(array)) {
            return { valid: false, message: 'La valeur doit être un tableau' };
        }

        if (array.length < minLength) {
            return { valid: false, message: `Le tableau doit contenir au moins ${minLength} élément(s)` };
        }

        if (array.length > maxLength) {
            return { valid: false, message: `Le tableau ne peut pas contenir plus de ${maxLength} élément(s)` };
        }

        // Valider les éléments si nécessaire
        if (itemType !== 'any') {
            for (let i = 0; i < array.length; i++) {
                const item = array[i];
                
                switch (itemType) {
                    case 'string':
                        if (typeof item !== 'string') {
                            return { valid: false, message: `L'élément ${i} doit être une chaîne de caractères` };
                        }
                        break;
                    case 'number':
                        if (typeof item !== 'number' || isNaN(item)) {
                            return { valid: false, message: `L'élément ${i} doit être un nombre` };
                        }
                        break;
                    case 'object':
                        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                            return { valid: false, message: `L'élément ${i} doit être un objet` };
                        }
                        break;
                    default:
                        // Type personnalisé
                        if (typeof item !== itemType) {
                            return { valid: false, message: `L'élément ${i} doit être de type ${itemType}` };
                        }
                }
            }
        }

        return { valid: true };
    }

    /**
     * Valider un objet
     */
    validateObject(obj, schema) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return { valid: false, message: 'La valeur doit être un objet' };
        }

        if (!schema) {
            return { valid: true }; // Pas de schéma = pas de validation
        }

        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = obj[field];

            // Champ requis
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} est requis`);
                continue;
            }

            // Si le champ n'est pas requis et absent, passer au suivant
            if (!rules.required && (value === undefined || value === null || value === '')) {
                continue;
            }

            // Type
            if (rules.type && typeof value !== rules.type) {
                errors.push(`${field} doit être de type ${rules.type}`);
                continue;
            }

            // Validation personnalisée
            if (rules.validate && typeof rules.validate === 'function') {
                const result = rules.validate(value);
                if (!result.valid) {
                    errors.push(`${field}: ${result.message}`);
                    continue;
                }
            }

            // Longueur pour les chaînes
            if (typeof value === 'string') {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${field} doit contenir au moins ${rules.minLength} caractères`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${field} ne peut pas dépasser ${rules.maxLength} caractères`);
                }
            }

            // Valeur numérique
            if (typeof value === 'number') {
                if (rules.min !== undefined && value < rules.min) {
                    errors.push(`${field} doit être supérieur à ${rules.min}`);
                }
                if (rules.max !== undefined && value > rules.max) {
                    errors.push(`${field} doit être inférieur à ${rules.max}`);
                }
            }
        }

        if (errors.length > 0) {
            return { valid: false, message: errors.join(', ') };
        }

        return { valid: true };
    }

    /**
     * Nettoyer et valider une entrée
     */
    sanitize(input, type = 'string') {
        if (input === null || input === undefined) {
            return null;
        }

        switch (type) {
            case 'string':
                return String(input).trim();
            case 'number':
                const num = parseFloat(input);
                return isNaN(num) ? null : num;
            case 'integer':
                const int = parseInt(input);
                return isNaN(int) ? null : int;
            case 'boolean':
                if (typeof input === 'boolean') return input;
                if (input === 'true' || input === '1') return true;
                if (input === 'false' || input === '0') return false;
                return null;
            case 'email':
                const email = String(input).trim().toLowerCase();
                return this.validateEmail(email).valid ? email : null;
            default:
                return input;
        }
    }

    /**
     * Valider les données d'inscription
     */
    validateRegistration(data) {
        const schema = {
            email: { required: true, type: 'string', validate: this.validateEmail.bind(this) },
            password: { required: true, type: 'string', validate: this.validatePassword.bind(this) },
            username: { required: true, type: 'string', validate: this.validateUsername.bind(this) },
            full_name: { required: true, type: 'string', validate: this.validateName.bind(this) },
            phone: { required: false, type: 'string', validate: this.validatePhone.bind(this) }
        };

        return this.validateObject(data, schema);
    }

    /**
     * Valider les données de connexion
     */
    validateLogin(data) {
        const schema = {
            email: { required: true, type: 'string', validate: this.validateEmail.bind(this) },
            password: { required: true, type: 'string' }
        };

        return this.validateObject(data, schema);
    }

    /**
     * Valider les données de produit
     */
    validateProduct(data) {
        const schema = {
            name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
            description: { required: false, type: 'string', maxLength: 2000 },
            price: { required: true, type: 'number', min: 0, max: 10000000 },
            compare_price: { required: false, type: 'number', min: 0, max: 10000000 },
            category_id: { required: false, type: 'number' },
            inventory_quantity: { required: false, type: 'number', min: 0 },
            weight: { required: false, type: 'number', min: 0 },
            tags: { required: false, type: 'object' }
        };

        return this.validateObject(data, schema);
    }

    /**
     * Valider les données de commande
     */
    validateOrder(data) {
        const schema = {
            items: { required: true, type: 'object' },
            shipping_address: { required: true, type: 'object' },
            billing_address: { required: false, type: 'object' },
            notes: { required: false, type: 'string', maxLength: 500 }
        };

        const result = this.validateObject(data, schema);
        
        if (!result.valid) {
            return result;
        }

        // Validation supplémentaire pour les items
        if (data.items && !Array.isArray(data.items)) {
            return { valid: false, message: 'Les items doivent être un tableau' };
        }

        if (data.items && data.items.length === 0) {
            return { valid: false, message: 'La commande doit contenir au moins un article' };
        }

        return { valid: true };
    }
}

module.exports = Validators;
