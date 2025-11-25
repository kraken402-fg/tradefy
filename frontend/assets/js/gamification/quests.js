/*!
 * Tradefy v3 - Quests System
 * Gestion des quêtes de passage et système de gamification
 * By Charbelus
 */

class QuestsSystem {
    constructor() {
        this.currentUser = null;
        this.activeQuests = [];
        this.completedQuests = [];
        this.questsConfig = this.getQuestsConfig();
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.checkActiveQuests();
    }

    /* ===== CONFIGURATION DES QUÊTES ===== */
    
    getQuestsConfig() {
        return {
            levelTransitions: {
                'profane_debutant': {
                    id: 'level_up_profane_debutant',
                    fromLevel: 'profane',
                    toLevel: 'debutant',
                    triggerSales: 23,
                    questLength: 5,
                    bonusCommission: 5.0,
                    title: '🚀 Passage Débutant',
                    description: 'Effectuez 5 ventes supplémentaires pour devenir Débutant et débloquer +5% de commission temporaire !',
                    reward: '+5% Commission pendant 30 jours',
                    color: 'debutant'
                },
                'debutant_marchand': {
                    id: 'level_up_debutant_marchand',
                    fromLevel: 'debutant',
                    toLevel: 'marchand',
                    triggerSales: 73,
                    questLength: 15,
                    bonusCommission: 6.0,
                    title: '📈 Passage Marchand',
                    description: '15 ventes supplémentaires pour atteindre le rang Marchand et gagner +6% de commission bonus !',
                    reward: '+6% Commission pendant 30 jours',
                    color: 'marchand'
                },
                'marchand_negociant': {
                    id: 'level_up_marchand_negociant',
                    fromLevel: 'marchand',
                    toLevel: 'negociant',
                    triggerSales: 227,
                    questLength: 25,
                    bonusCommission: 7.0,
                    title: '🔥 Passage Négociant',
                    description: '25 ventes pour devenir Négociant et profiter de +7% de commission supplémentaire !',
                    reward: '+7% Commission pendant 30 jours',
                    color: 'negociant'
                },
                'negociant_courtier': {
                    id: 'level_up_negociant_courtier',
                    fromLevel: 'negociant',
                    toLevel: 'courtier',
                    triggerSales: 554,
                    questLength: 35,
                    bonusCommission: 8.0,
                    title: '💎 Passage Courtier',
                    description: '35 ventes pour accéder au rang Courtier avec +8% de commission bonus !',
                    reward: '+8% Commission pendant 30 jours',
                    color: 'courtier'
                },
                'courtier_magnat': {
                    id: 'level_up_courtier_magnat',
                    fromLevel: 'courtier',
                    toLevel: 'magnat',
                    triggerSales: 1004,
                    questLength: 45,
                    bonusCommission: 9.0,
                    title: '🏆 Passage Magnat',
                    description: '45 ventes pour devenir Magnat et débloquer +9% de commission temporaire !',
                    reward: '+9% Commission pendant 30 jours',
                    color: 'magnat'
                },
                'magnat_senior': {
                    id: 'level_up_magnat_senior',
                    fromLevel: 'magnat',
                    toLevel: 'senior',
                    triggerSales: 2849,
                    questLength: 50,
                    bonusCommission: 10.0,
                    title: '👑 Passage Senior',
                    description: '50 dernières ventes pour atteindre le rang ultime Senior avec +10% de commission bonus !',
                    reward: '+10% Commission pendant 30 jours',
                    color: 'senior'
                }
            },
            specialQuests: {
                'first_sale': {
                    id: 'first_sale',
                    title: '🎯 Première Vente',
                    description: 'Réalisez votre première vente sur Tradefy',
                    requirement: { type: 'sales', target: 1 },
                    reward: { type: 'badge', value: 'first_sale' },
                    repeatable: false
                },
                'weekly_streak': {
                    id: 'weekly_streak',
                    title: '⚡ Série Hebdomadaire',
                    description: 'Effectuez 5 ventes en 7 jours consécutifs',
                    requirement: { type: 'streak', target: 5, days: 7 },
                    reward: { type: 'commission_bonus', value: 1.0, duration: 7 },
                    repeatable: true
                },
                'quick_riser': {
                    id: 'quick_riser',
                    title: '🚀 Ascension Rapide',
                    description: 'Passez 2 rangs en moins de 30 jours',
                    requirement: { type: 'rank_jump', target: 2, days: 30 },
                    reward: { type: 'badge', value: 'quick_riser' },
                    repeatable: false
                }
            }
        };
    }

    /* ===== GESTION DES DONNÉES UTILISATEUR ===== */

    async loadUserData() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const response = await fetch('/api/gamification/user-data', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData;
                this.processUserData(userData);
            }
        } catch (error) {
            console.error('Erreur chargement données utilisateur:', error);
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        // Données de fallback pour le développement
        this.currentUser = {
            id: 1,
            username: 'Vendeur_Test',
            salesCount: 25,
            currentLevel: 'profane',
            levelProgress: 45,
            joinedAt: new Date('2024-01-01')
        };
    }

    processUserData(userData) {
        this.activeQuests = userData.activeQuests || [];
        this.completedQuests = userData.completedQuests || [];
        this.updateQuestDisplays();
    }

    /* ===== VÉRIFICATION DES QUÊTES ACTIVES ===== */

    checkActiveQuests() {
        if (!this.currentUser) return;

        const salesCount = this.currentUser.salesCount;
        
        // Vérifier les quêtes de passage de niveau
        this.checkLevelUpQuests(salesCount);
        
        // Vérifier les quêtes spéciales
        this.checkSpecialQuests(salesCount);
        
        // Mettre à jour l'affichage
        this.updateQuestDisplays();
    }

    checkLevelUpQuests(currentSales) {
        for (const [transitionKey, questConfig] of Object.entries(this.questsConfig.levelTransitions)) {
            // Vérifier si l'utilisateur a déclenché la quête
            if (currentSales >= questConfig.triggerSales && 
                currentSales < (questConfig.triggerSales + questConfig.questLength)) {
                
                this.activateLevelUpQuest(questConfig, currentSales);
            }
            
            // Vérifier si la quête est complétée
            if (currentSales >= (questConfig.triggerSales + questConfig.questLength)) {
                this.completeLevelUpQuest(questConfig);
            }
        }
    }

    checkSpecialQuests(currentSales) {
        for (const [questId, questConfig] of Object.entries(this.questsConfig.specialQuests)) {
            if (this.isQuestCompleted(questId)) continue;
            
            if (this.checkQuestRequirements(questConfig, currentSales)) {
                this.completeSpecialQuest(questConfig);
            }
        }
    }

    /* ===== ACTIVATION ET COMPLÉTION DES QUÊTES ===== */

    activateLevelUpQuest(questConfig, currentSales) {
        const questProgress = currentSales - questConfig.triggerSales;
        const remainingSales = questConfig.questLength - questProgress;
        
        const activeQuest = {
            id: questConfig.id,
            type: 'level_up',
            title: questConfig.title,
            description: questConfig.description,
            progress: {
                current: questProgress,
                max: questConfig.questLength,
                remaining: remainingSales
            },
            reward: questConfig.reward,
            color: questConfig.color,
            bonusCommission: questConfig.bonusCommission,
            startedAt: new Date()
        };

        // Vérifier si la quête n'est pas déjà active
        if (!this.activeQuests.find(q => q.id === questConfig.id)) {
            this.activeQuests.push(activeQuest);
            this.showQuestNotification(activeQuest, 'activated');
        } else {
            // Mettre à jour la progression
            const existingQuest = this.activeQuests.find(q => q.id === questConfig.id);
            Object.assign(existingQuest, activeQuest);
        }
    }

    async completeLevelUpQuest(questConfig) {
        const questIndex = this.activeQuests.findIndex(q => q.id === questConfig.id);
        if (questIndex === -1) return;

        const completedQuest = this.activeQuests[questIndex];
        completedQuest.completedAt = new Date();
        completedQuest.progress.current = completedQuest.progress.max;
        completedQuest.progress.remaining = 0;

        // Déplacer vers les quêtes complétées
        this.activeQuests.splice(questIndex, 1);
        this.completedQuests.push(completedQuest);

        // Appliquer la récompense
        await this.applyQuestReward(completedQuest);
        
        // Afficher la notification de réussite
        this.showQuestNotification(completedQuest, 'completed');
        
        // Mettre à jour le niveau de l'utilisateur
        this.updateUserLevel(questConfig.toLevel);
    }

    async completeSpecialQuest(questConfig) {
        const completedQuest = {
            id: questConfig.id,
            type: 'special',
            title: questConfig.title,
            description: questConfig.description,
            completedAt: new Date(),
            reward: questConfig.reward
        };

        this.completedQuests.push(completedQuest);
        await this.applyQuestReward(completedQuest);
        this.showQuestNotification(completedQuest, 'completed');
    }

    /* ===== VÉRIFICATION DES CONDITIONS ===== */

    checkQuestRequirements(questConfig, currentSales) {
        const requirement = questConfig.requirement;
        
        switch (requirement.type) {
            case 'sales':
                return currentSales >= requirement.target;
                
            case 'streak':
                return this.checkSalesStreak(requirement.target, requirement.days);
                
            case 'rank_jump':
                return this.checkRankJump(requirement.target, requirement.days);
                
            default:
                return false;
        }
    }

    checkSalesStreak(targetSales, days) {
        // Implémentation simplifiée - à connecter avec les vraies données
        const recentSales = this.getRecentSales(days);
        return recentSales >= targetSales;
    }

    checkRankJump(targetRanks, days) {
        // Vérifier si l'utilisateur a grimpé de X rangs en Y jours
        const rankHistory = this.getRankHistory(days);
        return rankHistory.length >= targetRanks;
    }

    isQuestCompleted(questId) {
        return this.completedQuests.some(quest => quest.id === questId);
    }

    /* ===== APPLICATION DES RÉCOMPENSES ===== */

    async applyQuestReward(quest) {
        try {
            const token = localStorage.getItem('auth_token');
            
            switch (quest.type) {
                case 'level_up':
                    await this.applyCommissionBonus(quest.bonusCommission);
                    break;
                    
                case 'special':
                    if (quest.reward.type === 'commission_bonus') {
                        await this.applyCommissionBonus(quest.reward.value, quest.reward.duration);
                    } else if (quest.reward.type === 'badge') {
                        await this.awardBadge(quest.reward.value);
                    }
                    break;
            }

            // Sauvegarder la progression
            await this.saveQuestProgress(quest);

        } catch (error) {
            console.error('Erreur application récompense:', error);
        }
    }

    async applyCommissionBonus(bonusPercent, durationDays = 30) {
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch('/api/gamification/apply-bonus', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bonusPercent: bonusPercent,
                durationDays: durationDays,
                type: 'quest_reward'
            })
        });

        if (response.ok) {
            this.showBonusActivatedNotification(bonusPercent, durationDays);
        }
    }

    async awardBadge(badgeType) {
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch('/api/gamification/award-badge', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                badgeType: badgeType,
                awardedAt: new Date().toISOString()
            })
        });

        if (response.ok) {
            this.showBadgeAwardedNotification(badgeType);
        }
    }

    /* ===== MISES À JOUR DE L'INTERFACE ===== */

    updateQuestDisplays() {
        this.updateActiveQuestsDisplay();
        this.updateQuestProgressBars();
        this.updateLevelProgression();
    }

    updateActiveQuestsDisplay() {
        const container = document.getElementById('activeQuestsContainer');
        if (!container) return;

        if (this.activeQuests.length === 0) {
            container.innerHTML = this.getNoActiveQuestsHTML();
            return;
        }

        container.innerHTML = this.activeQuests.map(quest => 
            this.generateQuestCardHTML(quest)
        ).join('');
    }

    updateQuestProgressBars() {
        this.activeQuests.forEach(quest => {
            const progressBar = document.getElementById(`quest-progress-${quest.id}`);
            if (progressBar) {
                const progressPercent = (quest.progress.current / quest.progress.max) * 100;
                progressBar.style.width = `${progressPercent}%`;
                
                const progressText = document.getElementById(`quest-progress-text-${quest.id}`);
                if (progressText) {
                    progressText.textContent = `${quest.progress.current}/${quest.progress.max}`;
                }
            }
        });
    }

    updateLevelProgression() {
        if (!this.currentUser) return;

        const progressionElement = document.getElementById('levelProgression');
        if (progressionElement) {
            progressionElement.innerHTML = this.generateLevelProgressionHTML();
        }

        // Mettre à jour la barre de progression principale
        const mainProgressBar = document.getElementById('mainLevelProgress');
        if (mainProgressBar) {
            const progressPercent = this.calculateLevelProgress();
            mainProgressBar.style.width = `${progressPercent}%`;
        }
    }

    /* ===== GÉNÉRATION HTML ===== */

    generateQuestCardHTML(quest) {
        const progressPercent = (quest.progress.current / quest.progress.max) * 100;
        
        return `
            <div class="quest-card card bg-surface-1 border-${quest.color} mb-3" data-quest-id="${quest.id}">
                <div class="card-header bg-${quest.color} text-dark d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">${quest.title}</h6>
                    <span class="badge bg-dark">${quest.progress.remaining} ventes restantes</span>
                </div>
                <div class="card-body">
                    <p class="text-primary mb-3">${quest.description}</p>
                    
                    <div class="quest-progress mb-3">
                        <div class="d-flex justify-content-between text-sm mb-1">
                            <small class="text-muted">Progression</small>
                            <small class="text-${quest.color} fw-bold" id="quest-progress-text-${quest.id}">
                                ${quest.progress.current}/${quest.progress.max}
                            </small>
                        </div>
                        <div class="progress bg-surface-2" style="height: 8px;">
                            <div class="progress-bar bg-${quest.color}" 
                                 id="quest-progress-${quest.id}"
                                 style="width: ${progressPercent}%"
                                 role="progressbar">
                            </div>
                        </div>
                    </div>
                    
                    <div class="quest-reward d-flex align-items-center justify-content-between">
                        <small class="text-muted">
                            <i class="fas fa-gift me-1"></i>
                            Récompense: ${quest.reward}
                        </small>
                        ${quest.bonusCommission ? `
                            <span class="badge bg-success">
                                +${quest.bonusCommission}% Commission
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    generateLevelProgressionHTML() {
        if (!this.currentUser) return '';
        
        const currentLevel = this.currentUser.currentLevel;
        const salesCount = this.currentUser.salesCount;
        
        let html = '';
        for (const [transitionKey, questConfig] of Object.entries(this.questsConfig.levelTransitions)) {
            const isCompleted = salesCount >= (questConfig.triggerSales + questConfig.questLength);
            const isActive = salesCount >= questConfig.triggerSales && 
                           salesCount < (questConfig.triggerSales + questConfig.questLength);
            const isUpcoming = salesCount < questConfig.triggerSales;
            
            html += `
                <div class="rank-tier ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                    <div class="rank-header d-flex justify-content-between align-items-center p-3 rounded bg-surface-2 mb-2">
                        <div class="d-flex align-items-center">
                            <div class="rank-badge ${questConfig.fromLevel} me-3">${questConfig.fromLevel.charAt(0).toUpperCase()}</div>
                            <div>
                                <div class="vendor-name ${questConfig.fromLevel} fw-bold">${this.formatLevelName(questConfig.fromLevel)}</div>
                                <small class="text-muted">${questConfig.triggerSales}+ ventes</small>
                            </div>
                        </div>
                        <div class="text-end">
                            ${isCompleted ? `
                                <i class="fas fa-check-circle text-success"></i>
                            ` : isActive ? `
                                <small class="text-warning fw-bold">En cours</small>
                            ` : `
                                <small class="text-muted">À venir</small>
                            `}
                        </div>
                    </div>
                    ${isActive ? `
                        <div class="quest-info ps-4">
                            <small class="text-warning">
                                <i class="fas fa-quest me-1"></i>
                                Quête: ${questConfig.questLength} ventes pour +${questConfig.bonusCommission}% bonus
                            </small>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        return html;
    }

    getNoActiveQuestsHTML() {
        return `
            <div class="text-center py-5">
                <div class="mb-3">
                    <i class="fas fa-flag fa-3x text-muted"></i>
                </div>
                <h5 class="text-muted mb-2">Aucune quête active</h5>
                <p class="text-muted mb-0">
                    Continuez vos ventes pour déclencher de nouvelles quêtes de passage de niveau !
                </p>
            </div>
        `;
    }

    /* ===== NOTIFICATIONS ===== */

    showQuestNotification(quest, type) {
        const notification = this.createQuestNotification(quest, type);
        this.displayNotification(notification);
    }

    createQuestNotification(quest, type) {
        const icons = {
            activated: '🚀',
            completed: '🎉',
            progress: '📈'
        };

        const titles = {
            activated: 'Nouvelle Quête Débloquée !',
            completed: 'Quête Accomplie !',
            progress: 'Progression Quête'
        };

        const messages = {
            activated: `Vous avez débloqué: "${quest.title}"`,
            completed: `Félicitations ! Vous avez complété: "${quest.title}"`,
            progress: `Avancement sur "${quest.title}": ${quest.progress.current}/${quest.progress.max}`
        };

        return {
            title: titles[type],
            message: messages[type],
            icon: icons[type],
            type: type,
            quest: quest
        };
    }

    showBonusActivatedNotification(bonusPercent, durationDays) {
        const notification = {
            title: '🎉 Bonus Activé !',
            message: `+${bonusPercent}% de commission bonus pour ${durationDays} jours`,
            type: 'success',
            duration: 5000
        };
        
        this.displayNotification(notification);
    }

    showBadgeAwardedNotification(badgeType) {
        const badgeNames = {
            'first_sale': 'Première Vente',
            'quick_riser': 'Ascension Rapide'
        };

        const notification = {
            title: '🏆 Badge Débloqué !',
            message: `Vous avez obtenu le badge "${badgeNames[badgeType] || badgeType}"`,
            type: 'info',
            duration: 5000
        };
        
        this.displayNotification(notification);
    }

    displayNotification(notification) {
        // Créer et afficher la notification dans l'UI
        const notificationElement = document.createElement('div');
        notificationElement.className = `alert alert-${notification.type === 'completed' ? 'success' : 'info'} alert-dismissible fade show`;
        notificationElement.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="me-3" style="font-size: 1.5rem;">${notification.icon}</div>
                <div>
                    <strong>${notification.title}</strong><br>
                    <small>${notification.message}</small>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const notificationsContainer = document.getElementById('questNotifications') || 
                                     this.createNotificationsContainer();
        
        notificationsContainer.appendChild(notificationElement);

        // Auto-dismiss après un délai
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.remove();
            }
        }, notification.duration || 5000);
    }

    createNotificationsContainer() {
        const container = document.createElement('div');
        container.id = 'questNotifications';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1060';
        document.body.appendChild(container);
        return container;
    }

    /* ===== UTILITAIRES ===== */

    calculateLevelProgress() {
        if (!this.currentUser) return 0;
        
        const salesCount = this.currentUser.salesCount;
        const currentLevel = this.currentUser.currentLevel;
        
        // Trouver la transition actuelle
        for (const [transitionKey, questConfig] of Object.entries(this.questsConfig.levelTransitions)) {
            if (salesCount >= questConfig.triggerSales && 
                salesCount < (questConfig.triggerSales + questConfig.questLength)) {
                
                const progress = salesCount - questConfig.triggerSales;
                return (progress / questConfig.questLength) * 100;
            }
        }
        
        return 0;
    }

    formatLevelName(levelKey) {
        const names = {
            'profane': 'Profane',
            'debutant': 'Débutant',
            'marchand': 'Marchand',
            'negociant': 'Négociant',
            'courtier': 'Courtier',
            'magnat': 'Magnat',
            'senior': 'Senior'
        };
        
        return names[levelKey] || levelKey;
    }

    getRecentSales(days) {
        // Implémentation simplifiée - à connecter avec l'API réelle
        return Math.floor(Math.random() * 10);
    }

    getRankHistory(days) {
        // Implémentation simplifiée - à connecter avec l'API réelle
        return [];
    }

    updateUserLevel(newLevel) {
        if (this.currentUser) {
            this.currentUser.currentLevel = newLevel;
            this.triggerLevelUpAnimation(newLevel);
        }
    }

    triggerLevelUpAnimation(newLevel) {
        // Animation visuelle pour le passage de niveau
        const levelUpElement = document.createElement('div');
        levelUpElement.className = 'level-up-animation';
        levelUpElement.innerHTML = `
            <div class="level-up-content text-center">
                <div class="display-1 mb-3">🎉</div>
                <h3 class="text-gradient-accent">Niveau Supérieur !</h3>
                <p class="lead">Vous êtes maintenant <span class="vendor-name ${newLevel}">${this.formatLevelName(newLevel)}</span></p>
            </div>
        `;
        
        document.body.appendChild(levelUpElement);
        
        setTimeout(() => {
            levelUpElement.remove();
        }, 3000);
    }

    /* ===== SAUVEGARDE DES DONNÉES ===== */

    async saveQuestProgress(quest) {
        try {
            const token = localStorage.getItem('auth_token');
            
            await fetch('/api/gamification/save-quest-progress', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questId: quest.id,
                    completedAt: quest.completedAt,
                    type: quest.type
                })
            });
        } catch (error) {
            console.error('Erreur sauvegarde progression:', error);
        }
    }

    /* ===== ÉVÉNEMENTS ===== */

    setupEventListeners() {
        // Écouter les mises à jour des ventes
        document.addEventListener('salesUpdated', (event) => {
            this.handleSalesUpdate(event.detail);
        });

        // Écouter les clics sur les quêtes
        document.addEventListener('click', (event) => {
            const questCard = event.target.closest('.quest-card');
            if (questCard) {
                this.handleQuestClick(questCard.dataset.questId);
            }
        });

        // Polling pour les mises à jour en temps réel
        this.startPolling();
    }

    handleSalesUpdate(salesData) {
        if (this.currentUser) {
            this.currentUser.salesCount = salesData.totalSales;
            this.checkActiveQuests();
        }
    }

    handleQuestClick(questId) {
        const quest = this.activeQuests.find(q => q.id === questId) || 
                     this.completedQuests.find(q => q.id === questId);
        
        if (quest) {
            this.showQuestDetails(quest);
        }
    }

    showQuestDetails(quest) {
        // Afficher un modal avec les détails de la quête
        const modal = new bootstrap.Modal(document.getElementById('questDetailsModal'));
        const modalElement = document.getElementById('questDetailsModal');
        
        if (modalElement) {
            modalElement.querySelector('.modal-title').textContent = quest.title;
            modalElement.querySelector('.modal-body').innerHTML = this.generateQuestDetailsHTML(quest);
            modal.show();
        }
    }

    generateQuestDetailsHTML(quest) {
        return `
            <div class="quest-details">
                <p class="text-primary mb-3">${quest.description}</p>
                
                ${quest.progress ? `
                    <div class="progress-section mb-3">
                        <h6>Progression</h6>
                        <div class="progress bg-surface-2" style="height: 12px;">
                            <div class="progress-bar bg-${quest.color}" 
                                 style="width: ${(quest.progress.current / quest.progress.max) * 100}%">
                            </div>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <small class="text-muted">${quest.progress.current} ventes</small>
                            <small class="text-muted">${quest.progress.max} ventes</small>
                        </div>
                    </div>
                ` : ''}
                
                <div class="reward-section">
                    <h6>Récompense</h6>
                    <div class="alert alert-success">
                        <i class="fas fa-gift me-2"></i>
                        ${quest.reward}
                    </div>
                </div>
                
                ${quest.startedAt ? `
                    <div class="quest-meta mt-3">
                        <small class="text-muted">
                            Commencé le: ${new Date(quest.startedAt).toLocaleDateString()}
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    startPolling() {
        // Polling toutes les 30 secondes pour les mises à jour
        setInterval(() => {
            this.loadUserData();
        }, 30000);
    }

    /* ===== METHODES PUBLIQUES ===== */

    // Pour mise à jour manuelle des ventes
    updateSalesCount(newCount) {
        if (this.currentUser) {
            this.currentUser.salesCount = newCount;
            this.checkActiveQuests();
        }
    }

    // Pour réinitialisation (développement)
    resetQuests() {
        this.activeQuests = [];
        this.completedQuests = [];
        this.updateQuestDisplays();
    }

    // Récupérer les données actuelles
    getQuestData() {
        return {
            activeQuests: this.activeQuests,
            completedQuests: this.completedQuests,
            user: this.currentUser
        };
    }
}

/* ===== INITIALISATION ET EXPORT ===== */

// Instance globale
let questsSystem = null;

// Initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    questsSystem = new QuestsSystem();
});

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestsSystem;
} else {
    window.QuestsSystem = QuestsSystem;
    window.questsSystem = questsSystem;
}