/*!
 * Tradefy v3 - Level Transition System
 * Gestion des transitions de niveaux et animations de progression
 * By Charbelus
 */

class LevelTransitionSystem {
    constructor() {
        this.currentLevel = null;
        this.previousLevel = null;
        this.isTransitioning = false;
        this.transitionQueue = [];
        this.animationDuration = 3000;
        this.transitionConfig = this.getTransitionConfig();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCurrentLevel();
        this.setupLevelElements();
    }

    /* ===== CONFIGURATION DES TRANSITIONS ===== */

    getTransitionConfig() {
        return {
            'profane': {
                name: 'Profane',
                color: '#6c757d',
                icon: '🔰',
                requirements: { sales: 0 },
                nextLevel: 'debutant',
                animation: 'fadeIn'
            },
            'debutant': {
                name: 'Débutant',
                color: '#28a745',
                icon: '🚀',
                requirements: { sales: 23 },
                nextLevel: 'marchand',
                animation: 'slideUp',
                bonus: { commission: 5, duration: 30 }
            },
            'marchand': {
                name: 'Marchand',
                color: '#17a2b8',
                icon: '📈',
                requirements: { sales: 73 },
                nextLevel: 'negociant',
                animation: 'scaleUp',
                bonus: { commission: 6, duration: 30 }
            },
            'negociant': {
                name: 'Négociant',
                color: '#ffc107',
                icon: '🔥',
                requirements: { sales: 227 },
                nextLevel: 'courtier',
                animation: 'rotateIn',
                bonus: { commission: 7, duration: 30 }
            },
            'courtier': {
                name: 'Courtier',
                color: '#fd7e14',
                icon: '💎',
                requirements: { sales: 554 },
                nextLevel: 'magnat',
                animation: 'bounceIn',
                bonus: { commission: 8, duration: 30 }
            },
            'magnat': {
                name: 'Magnat',
                color: '#dc3545',
                icon: '🏆',
                requirements: { sales: 1004 },
                nextLevel: 'senior',
                animation: 'pulseIn',
                bonus: { commission: 9, duration: 30 }
            },
            'senior': {
                name: 'Senior',
                color: '#6f42c1',
                icon: '👑',
                requirements: { sales: 2849 },
                nextLevel: null,
                animation: 'glowIn',
                bonus: { commission: 10, duration: 30 }
            }
        };
    }

    /* ===== GESTION DES NIVEAUX ===== */

    async loadCurrentLevel() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const response = await fetch('/api/user/level', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentLevel = data.level;
                this.updateLevelDisplay();
            }
        } catch (error) {
            console.error('Erreur chargement niveau:', error);
            this.loadFallbackLevel();
        }
    }

    loadFallbackLevel() {
        // Données de fallback pour le développement
        this.currentLevel = 'profane';
        this.updateLevelDisplay();
    }

    async transitionToLevel(newLevel, triggerData = {}) {
        if (this.isTransitioning) {
            this.transitionQueue.push({ newLevel, triggerData });
            return;
        }

        this.isTransitioning = true;
        this.previousLevel = this.currentLevel;
        this.currentLevel = newLevel;

        // Émettre l'événement de début de transition
        this.emit('levelTransition.start', {
            from: this.previousLevel,
            to: newLevel,
            trigger: triggerData
        });

        // Exécuter la transition
        await this.executeTransition(newLevel, triggerData);

        // Mettre à jour les données utilisateur
        await this.updateUserLevel(newLevel);

        this.isTransitioning = false;

        // Traiter la file d'attente
        if (this.transitionQueue.length > 0) {
            const nextTransition = this.transitionQueue.shift();
            this.transitionToLevel(nextTransition.newLevel, nextTransition.triggerData);
        }
    }

    async executeTransition(newLevel, triggerData) {
        const config = this.transitionConfig[newLevel];
        
        // 1. Animation de transition
        await this.playTransitionAnimation(this.previousLevel, newLevel);
        
        // 2. Mise à jour de l'interface
        this.updateLevelDisplay();
        
        // 3. Notification de succès
        this.showLevelUpNotification(newLevel, config);
        
        // 4. Application des bonus
        if (config.bonus) {
            await this.applyLevelBonus(newLevel, config.bonus);
        }
        
        // 5. Déblocage des fonctionnalités
        this.unlockLevelFeatures(newLevel);
        
        // 6. Émettre l'événement de fin de transition
        this.emit('levelTransition.complete', {
            from: this.previousLevel,
            to: newLevel,
            bonus: config.bonus,
            trigger: triggerData
        });
    }

    /* ===== ANIMATIONS DE TRANSITION ===== */

    async playTransitionAnimation(fromLevel, toLevel) {
        const fromConfig = this.transitionConfig[fromLevel];
        const toConfig = this.transitionConfig[toLevel];
        
        // Créer l'élément d'animation
        const animationElement = this.createAnimationElement(fromLevel, toLevel);
        document.body.appendChild(animationElement);
        
        // Jouer l'animation spécifique au niveau
        await this.playSpecificAnimation(toConfig.animation, animationElement);
        
        // Nettoyer
        setTimeout(() => {
            if (animationElement.parentNode) {
                animationElement.remove();
            }
        }, 1000);
    }

    createAnimationElement(fromLevel, toLevel) {
        const fromConfig = this.transitionConfig[fromLevel];
        const toConfig = this.transitionConfig[toLevel];
        
        const element = document.createElement('div');
        element.className = 'level-transition-animation';
        element.innerHTML = `
            <div class="transition-container">
                <div class="level-old">
                    <div class="level-icon">${fromConfig.icon}</div>
                    <div class="level-name">${fromConfig.name}</div>
                </div>
                
                <div class="transition-arrow">➡️</div>
                
                <div class="level-new">
                    <div class="level-icon">${toConfig.icon}</div>
                    <div class="level-name">${toConfig.name}</div>
                </div>
                
                <div class="confetti-container"></div>
                <div class="sparkle-container"></div>
            </div>
        `;
        
        return element;
    }

    async playSpecificAnimation(animationType, element) {
        const container = element.querySelector('.transition-container');
        
        switch (animationType) {
            case 'slideUp':
                return this.playSlideUpAnimation(container);
            case 'scaleUp':
                return this.playScaleUpAnimation(container);
            case 'rotateIn':
                return this.playRotateInAnimation(container);
            case 'bounceIn':
                return this.playBounceInAnimation(container);
            case 'pulseIn':
                return this.playPulseInAnimation(container);
            case 'glowIn':
                return this.playGlowInAnimation(container);
            default:
                return this.playFadeInAnimation(container);
        }
    }

    playSlideUpAnimation(container) {
        return new Promise(resolve => {
            container.style.transform = 'translateY(100px)';
            container.style.opacity = '0';
            
            requestAnimationFrame(() => {
                container.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                container.style.transform = 'translateY(0)';
                container.style.opacity = '1';
                
                setTimeout(resolve, 800);
            });
        });
    }

    playScaleUpAnimation(container) {
        return new Promise(resolve => {
            container.style.transform = 'scale(0.5)';
            container.style.opacity = '0';
            
            requestAnimationFrame(() => {
                container.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                container.style.transform = 'scale(1)';
                container.style.opacity = '1';
                
                setTimeout(resolve, 600);
            });
        });
    }

    playRotateInAnimation(container) {
        return new Promise(resolve => {
            container.style.transform = 'rotate(-180deg) scale(0.5)';
            container.style.opacity = '0';
            
            requestAnimationFrame(() => {
                container.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                container.style.transform = 'rotate(0deg) scale(1)';
                container.style.opacity = '1';
                
                setTimeout(resolve, 800);
            });
        });
    }

    playBounceInAnimation(container) {
        return new Promise(resolve => {
            container.style.transform = 'scale(0.3)';
            container.style.opacity = '0';
            
            requestAnimationFrame(() => {
                container.style.transition = 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)';
                container.style.transform = 'scale(1.1)';
                container.style.opacity = '1';
                
                setTimeout(() => {
                    container.style.transform = 'scale(1)';
                    setTimeout(resolve, 300);
                }, 150);
            });
        });
    }

    playPulseInAnimation(container) {
        return new Promise(resolve => {
            container.style.transform = 'scale(0.8)';
            container.style.opacity = '0';
            
            requestAnimationFrame(() => {
                container.style.transition = 'all 0.7s ease-out';
                container.style.transform = 'scale(1.05)';
                container.style.opacity = '1';
                
                setTimeout(() => {
                    container.style.transform = 'scale(1)';
                    setTimeout(resolve, 200);
                }, 700);
            });
        });
    }

    playGlowInAnimation(container) {
        return new Promise(resolve => {
            container.style.opacity = '0';
            container.style.filter = 'blur(20px)';
            
            requestAnimationFrame(() => {
                container.style.transition = 'all 1s ease-out';
                container.style.opacity = '1';
                container.style.filter = 'blur(0px)';
                
                // Effet de glow
                container.style.boxShadow = '0 0 60px rgba(111, 66, 193, 0.6)';
                
                setTimeout(() => {
                    container.style.boxShadow = '0 0 20px rgba(111, 66, 193, 0.4)';
                    setTimeout(resolve, 500);
                }, 1000);
            });
        });
    }

    playFadeInAnimation(container) {
        return new Promise(resolve => {
            container.style.opacity = '0';
            
            requestAnimationFrame(() => {
                container.style.transition = 'opacity 0.5s ease-in';
                container.style.opacity = '1';
                
                setTimeout(resolve, 500);
            });
        });
    }

    /* ===== AFFICHAGE ET NOTIFICATIONS ===== */

    updateLevelDisplay() {
        // Mettre à jour tous les éléments affichant le niveau
        const levelElements = document.querySelectorAll('[data-level-display]');
        
        levelElements.forEach(element => {
            const config = this.transitionConfig[this.currentLevel];
            const displayType = element.dataset.levelDisplay;
            
            switch (displayType) {
                case 'name':
                    element.textContent = config.name;
                    break;
                case 'icon':
                    element.textContent = config.icon;
                    break;
                case 'badge':
                    this.updateLevelBadge(element, config);
                    break;
                case 'full':
                    this.updateFullLevelDisplay(element, config);
                    break;
            }
            
            // Appliquer la couleur du niveau
            if (config.color) {
                element.style.color = config.color;
            }
        });
    }

    updateLevelBadge(element, config) {
        element.innerHTML = `
            <span class="level-badge" style="background: ${config.color}">
                <span class="level-icon">${config.icon}</span>
                <span class="level-name">${config.name}</span>
            </span>
        `;
    }

    updateFullLevelDisplay(element, config) {
        element.innerHTML = `
            <div class="level-display-full">
                <div class="level-icon-large">${config.icon}</div>
                <div class="level-info">
                    <div class="level-name">${config.name}</div>
                    <div class="level-progress">
                        <div class="progress">
                            <div class="progress-bar" style="background: ${config.color}" 
                                 role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showLevelUpNotification(newLevel, config) {
        const notification = {
            title: '🎉 Niveau Supérieur !',
            message: `Félicitations ! Vous êtes maintenant ${config.name}`,
            icon: config.icon,
            color: config.color,
            duration: 5000
        };
        
        this.showNotification(notification);
        
        // Notification système
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/badge-72.png'
            });
        }
    }

    showNotification(notification) {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'level-up-notification';
        notificationElement.style.borderLeftColor = notification.color;
        
        notificationElement.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${notification.icon}</div>
                <div class="notification-text">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                </div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        const container = this.getNotificationContainer();
        container.appendChild(notificationElement);
        
        // Auto-remove
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.remove();
            }
        }, notification.duration);
        
        // Bouton fermer
        notificationElement.querySelector('.notification-close').addEventListener('click', () => {
            notificationElement.remove();
        });
    }

    getNotificationContainer() {
        let container = document.getElementById('level-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'level-notifications';
            container.className = 'level-notifications-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /* ===== BONUS ET FONCTIONNALITÉS ===== */

    async applyLevelBonus(level, bonus) {
        try {
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch('/api/user/apply-bonus', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    level: level,
                    bonus: bonus,
                    type: 'level_up'
                })
            });
            
            if (response.ok) {
                this.showBonusNotification(bonus);
                this.emit('bonus.applied', { level, bonus });
            }
        } catch (error) {
            console.error('Erreur application bonus:', error);
        }
    }

    showBonusNotification(bonus) {
        const notification = {
            title: '🎁 Bonus Débloqué !',
            message: `+${bonus.commission}% de commission pour ${bonus.duration} jours`,
            duration: 4000
        };
        
        this.showNotification(notification);
    }

    unlockLevelFeatures(level) {
        const features = this.getLevelFeatures(level);
        
        features.forEach(feature => {
            this.unlockFeature(feature);
        });
        
        this.emit('features.unlocked', { level, features });
    }

    getLevelFeatures(level) {
        const featureMap = {
            'debutant': ['advanced_stats', 'basic_analytics'],
            'marchand': ['product_catalog', 'sales_reports'],
            'negociant': ['bulk_operations', 'custom_categories'],
            'courtier': ['api_access', 'advanced_analytics'],
            'magnat': ['premium_support', 'custom_integrations'],
            'senior': ['all_features', 'priority_access']
        };
        
        return featureMap[level] || [];
    }

    unlockFeature(feature) {
        // Débloquer l'élément UI correspondant
        const featureElement = document.querySelector(`[data-feature="${feature}"]`);
        if (featureElement) {
            featureElement.classList.remove('locked');
            featureElement.classList.add('unlocked');
            
            // Animation de déblocage
            this.animateFeatureUnlock(featureElement);
        }
    }

    animateFeatureUnlock(element) {
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0.5';
        
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            element.style.transform = 'scale(1.1)';
            element.style.opacity = '1';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 500);
        });
    }

    /* ===== PROGRESSION ET CALCULS ===== */

    calculateProgressToNextLevel(currentSales) {
        const currentConfig = this.transitionConfig[this.currentLevel];
        
        if (!currentConfig.nextLevel) {
            return { progress: 100, nextLevel: null, required: 0 };
        }
        
        const nextConfig = this.transitionConfig[currentConfig.nextLevel];
        const requiredSales = nextConfig.requirements.sales;
        const progress = Math.min((currentSales / requiredSales) * 100, 100);
        
        return {
            progress: Math.round(progress),
            nextLevel: currentConfig.nextLevel,
            required: requiredSales,
            current: currentSales
        };
    }

    updateProgressDisplay(progressData) {
        const progressElements = document.querySelectorAll('[data-level-progress]');
        
        progressElements.forEach(element => {
            const displayType = element.dataset.levelProgress;
            
            switch (displayType) {
                case 'bar':
                    this.updateProgressBar(element, progressData);
                    break;
                case 'text':
                    this.updateProgressText(element, progressData);
                    break;
                case 'full':
                    this.updateFullProgress(element, progressData);
                    break;
            }
        });
    }

    updateProgressBar(element, progressData) {
        const bar = element.querySelector('.progress-bar') || element;
        bar.style.width = `${progressData.progress}%`;
        bar.setAttribute('aria-valuenow', progressData.progress);
        
        // Mettre à jour le tooltip si présent
        const tooltip = element.querySelector('.progress-tooltip');
        if (tooltip) {
            tooltip.textContent = `${progressData.current}/${progressData.required} ventes`;
        }
    }

    updateProgressText(element, progressData) {
        if (progressData.nextLevel) {
            element.textContent = `${progressData.progress}% vers ${this.transitionConfig[progressData.nextLevel].name}`;
        } else {
            element.textContent = 'Niveau maximum atteint !';
        }
    }

    updateFullProgress(element, progressData) {
        element.innerHTML = `
            <div class="level-progress-full">
                <div class="progress-header">
                    <span class="current-level">${this.transitionConfig[this.currentLevel].name}</span>
                    <span class="progress-percent">${progressData.progress}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progressData.progress}%"></div>
                </div>
                <div class="progress-footer">
                    <span class="next-level">${progressData.nextLevel ? this.transitionConfig[progressData.nextLevel].name : 'Niveau Max'}</span>
                    <span class="sales-count">${progressData.current}/${progressData.required}</span>
                </div>
            </div>
        `;
    }

    /* ===== GESTION DES DONNÉES ===== */

    async updateUserLevel(newLevel) {
        try {
            const token = localStorage.getItem('auth_token');
            
            await fetch('/api/user/update-level', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    level: newLevel,
                    updatedAt: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Erreur mise à jour niveau:', error);
        }
    }

    /* ===== ÉVÉNEMENTS ===== */

    setupEventListeners() {
        // Écouter les événements de progression
        document.addEventListener('salesUpdated', (event) => {
            this.handleSalesUpdate(event.detail);
        });
        
        // Écouter les transitions manuelles (pour les tests)
        document.addEventListener('levelTransitionRequest', (event) => {
            this.transitionToLevel(event.detail.level, event.detail);
        });
        
        // Écouter les changements de visibilité
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadCurrentLevel();
            }
        });
    }

    handleSalesUpdate(salesData) {
        const progressData = this.calculateProgressToNextLevel(salesData.totalSales);
        this.updateProgressDisplay(progressData);
        
        // Vérifier si un changement de niveau est nécessaire
        if (progressData.nextLevel && salesData.totalSales >= progressData.required) {
            this.transitionToLevel(progressData.nextLevel, {
                type: 'sales_milestone',
                sales: salesData.totalSales
            });
        }
    }

    /* ===== ÉMISSION D'ÉVÉNEMENTS ===== */

    emit(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
    }

    /* ===== MÉTHODES PUBLIQUES ===== */

    // Forcer une transition (pour tests)
    forceTransition(toLevel) {
        this.transitionToLevel(toLevel, { type: 'manual' });
    }

    // Récupérer les informations du niveau actuel
    getCurrentLevelInfo() {
        return {
            ...this.transitionConfig[this.currentLevel],
            progress: this.calculateProgressToNextLevel(this.getCurrentSales())
        };
    }

    // Réinitialiser (pour tests)
    resetToLevel(level) {
        this.currentLevel = level;
        this.previousLevel = null;
        this.updateLevelDisplay();
    }

    getCurrentSales() {
        // À implémenter selon votre structure de données
        return parseInt(localStorage.getItem('currentSales') || '0');
    }
}

/* ===== INJECTION DES STYLES ===== */

const injectLevelTransitionStyles = () => {
    const styles = `
        .level-transition-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
        }
        
        .transition-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 3rem;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 2rem;
            color: white;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
        }
        
        .level-old, .level-new {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }
        
        .level-icon {
            font-size: 4rem;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        
        .level-name {
            font-size: 1.5rem;
            font-weight: bold;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .transition-arrow {
            font-size: 3rem;
            animation: bounce 1s infinite;
        }
        
        .level-up-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--surface-1);
            border-left: 4px solid;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            padding: 1rem;
            gap: 1rem;
        }
        
        .notification-icon {
            font-size: 2rem;
        }
        
        .notification-text {
            flex: 1;
        }
        
        .notification-title {
            font-weight: bold;
            margin-bottom: 0.25rem;
        }
        
        .notification-message {
            color: var(--text-muted);
            font-size: 0.9rem;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-muted);
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .level-notifications-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .level-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 50px;
            color: white;
            font-weight: bold;
            font-size: 0.9rem;
        }
        
        .level-display-full {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
        }
        
        .level-icon-large {
            font-size: 3rem;
        }
        
        .level-progress-full {
            background: var(--surface-2);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        
        .progress-header, .progress-footer {
            display: flex;
            justify-content: between;
            margin-bottom: 0.5rem;
        }
        
        .progress-bar-container {
            background: var(--surface-3);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
            transition: width 0.5s ease-in-out;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(10px); }
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .feature.locked {
            opacity: 0.5;
            filter: grayscale(1);
            pointer-events: none;
        }
        
        .feature.unlocked {
            opacity: 1;
            filter: none;
            pointer-events: all;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
};

/* ===== INITIALISATION ===== */

let levelTransitionSystem = null;

document.addEventListener('DOMContentLoaded', function() {
    injectLevelTransitionStyles();
    levelTransitionSystem = new LevelTransitionSystem();
    
    // Exposer globalement pour le débogage
    window.tradefyLevels = levelTransitionSystem;
});

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelTransitionSystem;
} else {
    window.LevelTransitionSystem = LevelTransitionSystem;
}