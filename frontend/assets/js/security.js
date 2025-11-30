/**
 * =============================================
 * 🔐 Tradefy - Configuration et Utilitaires Frontend
 * =============================================
 */

// Configuration de l'application
const TradefyConfig = {
    // URLs des plateformes
    api: {
        baseUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : 'https://tradefy-backend.infinityfreeapp.com/api',
        timeout: 30000
    },
    
    // URLs des pages
    urls: {
        login: 'login.html',
        register: 'register.html',
        profile: 'profile.html',
        products: 'products.html',
        orders: 'orders.html',
        home: '../index.html'
    },
    
    // Configuration de sécurité
    security: {
        tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes avant expiration
        maxLoginAttempts: 3,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        sessionTimeout: 2 * 60 * 60 * 1000 // 2 heures
    },
    
    // Messages d'erreur
    messages: {
        networkError: 'Erreur de connexion. Vérifiez votre internet.',
        sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
        unauthorized: 'Accès non autorisé.',
        serverError: 'Erreur serveur. Veuillez réessayer plus tard.'
    }
};

// Gestionnaire de sécurité
class SecurityManager {
    constructor() {
        this.attempts = this.getStoredAttempts();
        this.sessionTimer = null;
        this.initSessionMonitoring();
    }
    
    /**
     * Nettoyer les entrées utilisateur
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }
    
    /**
     * Valider un email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Valider un mot de passe
     */
    static isStrongPassword(password) {
        // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    }
    
    /**
     * Générer un token CSRF
     */
    static generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Vérifier les tentatives de connexion
     */
    checkLoginAttempts(email) {
        const attempts = this.attempts[email] || { count: 0, lockoutUntil: null };
        const now = Date.now();
        
        // Si verrouillé, vérifier si le délai est passé
        if (attempts.lockoutUntil && now < attempts.lockoutUntil) {
            const remainingTime = Math.ceil((attempts.lockoutUntil - now) / 60000);
            throw new Error(`Trop de tentatives. Réessayez dans ${remainingTime} minutes.`);
        }
        
        // Réinitialiser si le délai est passé
        if (attempts.lockoutUntil && now >= attempts.lockoutUntil) {
            attempts.count = 0;
            attempts.lockoutUntil = null;
        }
        
        return attempts;
    }
    
    /**
     * Enregistrer une tentative de connexion échouée
     */
    recordFailedAttempt(email) {
        const attempts = this.checkLoginAttempts(email);
        attempts.count++;
        
        // Verrouiller après 3 tentatives
        if (attempts.count >= TradefyConfig.security.maxLoginAttempts) {
            attempts.lockoutUntil = Date.now() + TradefyConfig.security.lockoutDuration;
        }
        
        this.attempts[email] = attempts;
        this.saveAttempts();
    }
    
    /**
     * Réinitialiser les tentatives après connexion réussie
     */
    resetAttempts(email) {
        delete this.attempts[email];
        this.saveAttempts();
    }
    
    /**
     * Obtenir les tentatives stockées
     */
    getStoredAttempts() {
        const stored = localStorage.getItem('login_attempts');
        return stored ? JSON.parse(stored) : {};
    }
    
    /**
     * Sauvegarder les tentatives
     */
    saveAttempts() {
        localStorage.setItem('login_attempts', JSON.stringify(this.attempts));
    }
    
    /**
     * Initialiser le monitoring de session
     */
    initSessionMonitoring() {
        // Vérifier l'activité utilisateur
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.resetSessionTimer(), true);
        });
        
        this.resetSessionTimer();
    }
    
    /**
     * Réinitialiser le timer de session
     */
    resetSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        this.sessionTimer = setTimeout(() => {
            this.logout('Session expirée');
        }, TradefyConfig.security.sessionTimeout);
    }
    
    /**
     * Déconnexion
     */
    logout(reason = 'Déconnexion') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        
        if (reason) {
            alert(reason);
        }
        
        window.location.href = TradefyConfig.urls.login;
    }
}

// Gestionnaire d'API
class APIManager {
    constructor() {
        this.baseUrl = TradefyConfig.api.baseUrl;
        this.timeout = TradefyConfig.api.timeout;
    }
    
    /**
     * Faire une requête API sécurisée
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = localStorage.getItem('auth_token');
        
        // Configuration par défaut
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            },
            ...options
        };
        
        // Ajouter le token d'authentification
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Ajouter token CSRF pour les requêtes POST/PUT/DELETE
        if (['POST', 'PUT', 'DELETE'].includes(config.method?.toUpperCase())) {
            config.headers['X-CSRF-Token'] = SecurityManager.generateCSRFToken();
        }
        
        try {
            // Timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            config.signal = controller.signal;
            
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            
            // Gérer les réponses d'erreur
            if (!response.ok) {
                await this.handleErrorResponse(response);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Délai d\'attente dépassé');
            }
            throw error;
        }
    }
    
    /**
     * Gérer les réponses d'erreur
     */
    async handleErrorResponse(response) {
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
            case 401:
                if (errorData.error?.code === 'TOKEN_EXPIRED') {
                    await this.refreshToken();
                    return; // La requête sera retentée
                } else {
                    const securityManager = new SecurityManager();
                    securityManager.logout('Session expirée');
                }
                break;
                
            case 403:
                throw new Error('Accès non autorisé');
                
            case 429:
                throw new Error('Trop de requêtes. Veuillez ralentir.');
                
            case 500:
                throw new Error(TradefyConfig.messages.serverError);
                
            default:
                throw new Error(errorData.error?.message || 'Erreur inconnue');
        }
        
        throw new Error(errorData.error?.message || 'Erreur HTTP');
    }
    
    /**
     * Rafraîchir le token
     */
    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            throw new Error('Token de rafraîchissement manquant');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            // Mettre à jour les tokens
            localStorage.setItem('auth_token', data.token);
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
            
        } catch (error) {
            const securityManager = new SecurityManager();
            securityManager.logout('Session expirée');
            throw error;
        }
    }
    
    // Méthodes pratiques
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Gestionnaire d'authentification
class AuthManager {
    constructor() {
        this.api = new APIManager();
        this.security = new SecurityManager();
    }
    
    /**
     * Connexion sécurisée
     */
    async login(email, password, rememberMe = false) {
        try {
            // Validation des entrées
            const sanitizedEmail = SecurityManager.sanitizeInput(email);
            const sanitizedPassword = password; // Ne pas nettoyer les mots de passe
            
            if (!SecurityManager.isValidEmail(sanitizedEmail)) {
                throw new Error('Email invalide');
            }
            
            // Vérifier les tentatives
            this.security.checkLoginAttempts(sanitizedEmail);
            
            // Appel API
            const response = await this.api.post('/auth/login', {
                email: sanitizedEmail,
                password: sanitizedPassword,
                remember_me: rememberMe
            });
            
            if (!response.success) {
                throw new Error(response.error?.message || 'Échec de connexion');
            }
            
            // Stocker les tokens de manière sécurisée
            localStorage.setItem('auth_token', response.data.token);
            if (response.data.refresh_token) {
                localStorage.setItem('refresh_token', response.data.refresh_token);
            }
            localStorage.setItem('user_data', JSON.stringify(response.data.user));
            
            // Réinitialiser les tentatives
            this.security.resetAttempts(sanitizedEmail);
            
            return response.data;
            
        } catch (error) {
            if (error.message.includes('Trop de tentatives')) {
                throw error;
            }
            
            // Enregistrer la tentative échouée
            this.security.recordFailedAttempt(email);
            throw error;
        }
    }
    
    /**
     * Inscription sécurisée
     */
    async register(userData) {
        try {
            // Validation et nettoyage des données
            const sanitizedData = {
                email: SecurityManager.sanitizeInput(userData.email),
                username: SecurityManager.sanitizeInput(userData.username),
                password: userData.password, // Ne pas nettoyer
                full_name: SecurityManager.sanitizeInput(userData.full_name),
                phone: SecurityManager.sanitizeInput(userData.phone)
            };
            
            // Validation
            if (!SecurityManager.isValidEmail(sanitizedData.email)) {
                throw new Error('Email invalide');
            }
            
            if (!SecurityManager.isStrongPassword(sanitizedData.password)) {
                throw new Error('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre');
            }
            
            if (sanitizedData.username.length < 3) {
                throw new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères');
            }
            
            // Appel API
            const response = await this.api.post('/auth/register', sanitizedData);
            
            if (!response.success) {
                throw new Error(response.error?.message || 'Échec d\'inscription');
            }
            
            return response.data;
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Déconnexion
     */
    async logout() {
        try {
            // Appel API pour invalider le token
            await this.api.post('/auth/logout');
        } catch (error) {
            // Ignorer les erreurs et continuer la déconnexion locale
            console.warn('Logout API failed:', error);
        }
        
        // Nettoyer le stockage local
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('login_attempts');
        
        // Redirection
        window.location.href = TradefyConfig.urls.login;
    }
    
    /**
     * Vérifier si l'utilisateur est connecté
     */
    isAuthenticated() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        return !!(token && userData);
    }
    
    /**
     * Obtenir les données utilisateur
     */
    getUserData() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }
}

// Gestionnaire d'interface utilisateur
class UIManager {
    /**
     * Afficher une alerte
     */
    static showAlert(type, message, container = '.auth-card') {
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 
                          'alert-success';
                          
        const icon = type === 'error' ? 'exclamation-triangle' : 
                   type === 'warning' ? 'exclamation-triangle' : 
                   'check-circle';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="fas fa-${icon} me-2"></i>
                ${SecurityManager.sanitizeInput(message)}
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const containerEl = document.querySelector(container);
        if (containerEl) {
            // Supprimer les alertes existantes
            containerEl.querySelectorAll('.alert').forEach(alert => alert.remove());
            
            // Insérer la nouvelle alerte
            containerEl.insertAdjacentHTML('afterbegin', alertHtml);
            
            // Auto-suppression après 5 secondes
            setTimeout(() => {
                const alert = containerEl.querySelector('.alert');
                if (alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, 5000);
        }
    }
    
    /**
     * Gérer l'état de chargement d'un bouton
     */
    static setButtonLoading(buttonId, loading = true) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const spinner = button.querySelector('.spinner-border');
        const icon = button.querySelector('.fa');
        
        if (loading) {
            if (spinner) spinner.classList.remove('d-none');
            if (icon) icon.classList.add('d-none');
            button.disabled = true;
        } else {
            if (spinner) spinner.classList.add('d-none');
            if (icon) icon.classList.remove('d-none');
            button.disabled = false;
        }
    }
    
    /**
     * Valider un formulaire
     */
    static validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: ['Formulaire non trouvé'] };
        
        const errors = [];
        const formData = new FormData(form);
        
        Object.keys(rules).forEach(fieldName => {
            const value = formData.get(fieldName);
            const rule = rules[fieldName];
            
            if (rule.required && (!value || value.trim() === '')) {
                errors.push(`${rule.label} est requis`);
                return;
            }
            
            if (rule.email && value && !SecurityManager.isValidEmail(value)) {
                errors.push(`${rule.label} est invalide`);
            }
            
            if (rule.minLength && value && value.length < rule.minLength) {
                errors.push(`${rule.label} doit contenir au moins ${rule.minLength} caractères`);
            }
            
            if (rule.pattern && value && !rule.pattern.test(value)) {
                errors.push(`${rule.label} est invalide`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Exporter pour utilisation globale
window.TradefyConfig = TradefyConfig;
window.SecurityManager = SecurityManager;
window.APIManager = APIManager;
window.AuthManager = AuthManager;
window.UIManager = UIManager;

// Initialisation globale
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'authentification
    const authManager = new AuthManager();
    
    // Rediriger si déjà connecté
    if (authManager.isAuthenticated()) {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'login.html' || currentPage === 'register.html') {
            window.location.href = TradefyConfig.urls.home;
        }
    }
    
    // Rediriger vers login si non authentifié sur les pages protégées
    const protectedPages = ['profile.html', 'orders.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !authManager.isAuthenticated()) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${TradefyConfig.urls.login}?return=${returnUrl}`;
    }
});
