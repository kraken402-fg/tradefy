/*!
 * Tradefy v3 - Events System
 * Gestion des événements en temps réel et système de notifications
 * By Charbelus
 */

class EventsSystem {
    constructor() {
        this.eventHandlers = new Map();
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.pendingEvents = [];
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.healthCheckInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initWebSocket();
        this.setupServiceWorker();
        this.startHealthCheck();
    }

    /* ===== SYSTÈME WEBSOCKET ===== */

    initWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/events`;
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => this.handleSocketOpen();
            this.socket.onmessage = (event) => this.handleSocketMessage(event);
            this.socket.onclose = (event) => this.handleSocketClose(event);
            this.socket.onerror = (error) => this.handleSocketError(error);
            
        } catch (error) {
            console.error('Erreur initialisation WebSocket:', error);
            this.fallbackToPolling();
        }
    }

    handleSocketOpen() {
        console.log('✅ WebSocket connecté');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Envoyer les événements en attente
        this.flushPendingEvents();
        
        // Émettre l'événement de connexion
        this.emit('socket.connected', {
            timestamp: new Date(),
            type: 'connection'
        });
    }

    handleSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.processIncomingEvent(data);
        } catch (error) {
            console.error('Erreur traitement message WebSocket:', error);
        }
    }

    handleSocketClose(event) {
        console.log('🔌 WebSocket déconnecté:', event.code, event.reason);
        this.isConnected = false;
        
        this.emit('socket.disconnected', {
            timestamp: new Date(),
            code: event.code,
            reason: event.reason
        });

        this.attemptReconnect();
    }

    handleSocketError(error) {
        console.error('❌ Erreur WebSocket:', error);
        this.emit('socket.error', {
            timestamp: new Date(),
            error: error.message
        });
    }

    /* ===== RECONNEXION AUTOMATIQUE ===== */

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max reconnection attempts reached, falling back to polling');
            this.fallbackToPolling();
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts} dans ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.initWebSocket();
            }
        }, delay);
    }

    fallbackToPolling() {
        console.log('🔄 Passage en mode polling');
        this.startPolling();
    }

    startPolling() {
        // Polling toutes les 30 secondes
        this.pollingInterval = setInterval(() => {
            this.fetchPendingEvents();
        }, 30000);
        
        // Premier fetch immédiat
        this.fetchPendingEvents();
    }

    async fetchPendingEvents() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const response = await fetch('/api/events/pending', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const events = await response.json();
                events.forEach(event => this.processIncomingEvent(event));
            }
        } catch (error) {
            console.error('Erreur fetch événements:', error);
        }
    }

    /* ===== GESTION DES ÉVÉNEMENTS ===== */

    processIncomingEvent(eventData) {
        // Ajouter à l'historique
        this.addToHistory(eventData);
        
        // Émettre l'événement localement
        this.emit(eventData.type, eventData);
        
        // Traitement spécifique selon le type
        this.handleEventByType(eventData);
        
        // Notification utilisateur si nécessaire
        if (this.shouldNotifyUser(eventData)) {
            this.showUserNotification(eventData);
        }
    }

    handleEventByType(eventData) {
        const handlers = {
            'sale.completed': (data) => this.handleSaleCompleted(data),
            'quest.activated': (data) => this.handleQuestActivated(data),
            'quest.completed': (data) => this.handleQuestCompleted(data),
            'level.up': (data) => this.handleLevelUp(data),
            'commission.updated': (data) => this.handleCommissionUpdated(data),
            'message.received': (data) => this.handleMessageReceived(data),
            'system.alert': (data) => this.handleSystemAlert(data),
            'user.achievement': (data) => this.handleUserAchievement(data)
        };

        const handler = handlers[eventData.type];
        if (handler) {
            handler(eventData);
        }
    }

    /* ===== HANDLERS SPÉCIFIQUES ===== */

    handleSaleCompleted(data) {
        // Mettre à jour le compteur de ventes
        this.updateSalesCounter(data.salesCount);
        
        // Déclencher l'événement de mise à jour des ventes
        this.emit('salesUpdated', {
            totalSales: data.salesCount,
            saleAmount: data.amount,
            product: data.product,
            timestamp: data.timestamp
        });

        // Animation de nouvelle vente
        this.showSaleAnimation(data);
    }

    handleQuestActivated(data) {
        // Notification de nouvelle quête
        this.showQuestNotification(data.quest, 'activated');
        
        // Mettre à jour l'interface des quêtes
        this.emit('questActivated', data.quest);
    }

    handleQuestCompleted(data) {
        // Notification de quête accomplie
        this.showQuestNotification(data.quest, 'completed');
        
        // Animation de récompense
        this.showRewardAnimation(data.reward);
        
        // Mettre à jour l'interface
        this.emit('questCompleted', data);
    }

    handleLevelUp(data) {
        // Animation de niveau supérieur
        this.showLevelUpAnimation(data.newLevel, data.oldLevel);
        
        // Notification
        this.showLevelUpNotification(data);
        
        // Mettre à jour l'interface
        this.emit('levelUp', data);
    }

    handleCommissionUpdated(data) {
        // Mettre à jour l'affichage de la commission
        this.updateCommissionDisplay(data.newCommission, data.bonus);
        
        // Notification si bonus
        if (data.bonus) {
            this.showBonusNotification(data);
        }
    }

    handleMessageReceived(data) {
        // Notification de nouveau message
        this.showMessageNotification(data);
        
        // Mettre à jour le compteur de messages
        this.updateUnreadMessagesCount(data.count);
        
        // Son de notification si la page n'est pas active
        if (!document.hasFocus()) {
            this.playNotificationSound();
        }
    }

    handleSystemAlert(data) {
        // Alertes système importantes
        this.showSystemAlert(data);
        
        // Log dans la console
        console.warn('🚨 Alerte système:', data.message);
    }

    handleUserAchievement(data) {
        // Badges et achievements
        this.showAchievementNotification(data);
        
        // Animation spéciale
        this.showAchievementAnimation(data.achievement);
    }

    /* ===== SYSTÈME DE NOTIFICATIONS ===== */

    shouldNotifyUser(eventData) {
        const silentEvents = ['commission.updated', 'user.presence'];
        return !silentEvents.includes(eventData.type);
    }

    showUserNotification(eventData) {
        const notification = this.createNotification(eventData);
        
        // Notification native du navigateur
        if ('Notification' in window && Notification.permission === 'granted') {
            this.showNativeNotification(notification);
        }
        
        // Notification dans l'interface
        this.showInAppNotification(notification);
        
        // Son de notification
        this.playNotificationSound();
    }

    createNotification(eventData) {
        const templates = {
            'sale.completed': {
                title: '🎉 Vente réalisée !',
                message: `Vous avez vendu ${eventData.product} pour ${eventData.amount}€`,
                icon: '💰',
                type: 'success'
            },
            'quest.activated': {
                title: '🚀 Nouvelle quête !',
                message: eventData.quest.title,
                icon: '🎯',
                type: 'info'
            },
            'quest.completed': {
                title: '🏆 Quête accomplie !',
                message: `Félicitations ! ${eventData.quest.title}`,
                icon: '🎉',
                type: 'success'
            },
            'level.up': {
                title: '⭐ Niveau supérieur !',
                message: `Vous êtes maintenant ${eventData.newLevel}`,
                icon: '🚀',
                type: 'warning'
            },
            'message.received': {
                title: '💌 Nouveau message',
                message: `${eventData.sender}: ${eventData.preview}`,
                icon: '📨',
                type: 'info'
            }
        };

        return templates[eventData.type] || {
            title: 'Notification',
            message: eventData.message || 'Nouvel événement',
            icon: '🔔',
            type: 'info'
        };
    }

    showNativeNotification(notification) {
        const notif = new Notification(notification.title, {
            body: notification.message,
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/badge-72.png',
            tag: 'tradefy-notification',
            requireInteraction: notification.type === 'success'
        });

        notif.onclick = () => {
            window.focus();
            notif.close();
        };

        setTimeout(() => notif.close(), 5000);
    }

    showInAppNotification(notification) {
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification toast show ${notification.type}`;
        notificationElement.innerHTML = `
            <div class="toast-header">
                <span class="me-2">${notification.icon}</span>
                <strong class="me-auto">${notification.title}</strong>
                <small class="text-muted">${this.formatTime(new Date())}</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${notification.message}
            </div>
        `;

        const container = this.getNotificationsContainer();
        container.appendChild(notificationElement);

        // Auto-remove après 5 secondes
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.remove();
            }
        }, 5000);
    }

    getNotificationsContainer() {
        let container = document.getElementById('notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1060';
            document.body.appendChild(container);
        }
        return container;
    }

    /* ===== ANIMATIONS ===== */

    showSaleAnimation(saleData) {
        const animation = document.createElement('div');
        animation.className = 'sale-animation';
        animation.innerHTML = `
            <div class="sale-popup">
                <div class="sale-icon">💰</div>
                <div class="sale-amount">+${saleData.amount}€</div>
                <div class="sale-product">${saleData.product}</div>
            </div>
        `;

        document.body.appendChild(animation);

        setTimeout(() => {
            animation.remove();
        }, 3000);
    }

    showLevelUpAnimation(newLevel, oldLevel) {
        const animation = document.createElement('div');
        animation.className = 'level-up-animation';
        animation.innerHTML = `
            <div class="level-up-content">
                <div class="confetti"></div>
                <div class="level-badge">${newLevel.charAt(0).toUpperCase()}</div>
                <h3>Niveau Supérieur !</h3>
                <p>${oldLevel} → ${newLevel}</p>
            </div>
        `;

        document.body.appendChild(animation);

        setTimeout(() => {
            animation.remove();
        }, 4000);
    }

    showRewardAnimation(reward) {
        const animation = document.createElement('div');
        animation.className = 'reward-animation';
        animation.innerHTML = `
            <div class="reward-content">
                <div class="reward-icon">🎁</div>
                <div class="reward-text">${reward}</div>
            </div>
        `;

        document.body.appendChild(animation);

        setTimeout(() => {
            animation.remove();
        }, 3000);
    }

    showAchievementAnimation(achievement) {
        const animation = document.createElement('div');
        animation.className = 'achievement-animation';
        animation.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-badge">🏆</div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;

        document.body.appendChild(animation);

        setTimeout(() => {
            animation.remove();
        }, 5000);
    }

    /* ===== GESTION DES ÉVÉNEMENTS ===== */

    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    off(eventType, handler) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(eventType, data) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${eventType}:`, error);
                }
            });
        }

        // Émettre également sur le document pour les composants qui écoutent les events DOM
        const customEvent = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(customEvent);
    }

    /* ===== SERVICE WORKER & PUSH NOTIFICATIONS ===== */

    async setupServiceWorker() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker enregistré');

                // Demander la permission pour les notifications
                await this.requestNotificationPermission();
                
                // S'abonner aux push notifications
                await this.subscribeToPushNotifications(registration);

            } catch (error) {
                console.error('❌ Erreur Service Worker:', error);
            }
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Permission notifications accordée');
            }
        }
    }

    async subscribeToPushNotifications(registration) {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY)
            });

            // Envoyer l'abonnement au serveur
            await this.sendSubscriptionToServer(subscription);
            
        } catch (error) {
            console.error('❌ Erreur abonnement push:', error);
        }
    }

    /* ===== SANTÉ ET SURVEILLANCE ===== */

    startHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            this.checkConnectionHealth();
        }, 30000); // Toutes les 30 secondes
    }

    checkConnectionHealth() {
        if (this.isConnected) {
            // Envoyer un ping pour vérifier la connexion
            this.sendPing();
        } else if (this.reconnectAttempts === 0) {
            // Tentative de reconnexion si déconnecté sans tentative en cours
            this.initWebSocket();
        }
    }

    sendPing() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
            }));
        }
    }

    /* ===== GESTION DE L'HISTORIQUE ===== */

    addToHistory(eventData) {
        this.eventHistory.unshift({
            ...eventData,
            receivedAt: new Date()
        });

        // Garder seulement les N derniers événements
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
        }
    }

    getEventHistory(filter = null) {
        if (filter) {
            return this.eventHistory.filter(event => event.type === filter);
        }
        return this.eventHistory;
    }

    clearHistory() {
        this.eventHistory = [];
    }

    /* ===== ÉVÉNEMENTS EN ATTENTE ===== */

    addPendingEvent(eventData) {
        this.pendingEvents.push(eventData);
        
        // Essayer d'envoyer immédiatement si connecté
        if (this.isConnected) {
            this.flushPendingEvents();
        }
    }

    flushPendingEvents() {
        if (!this.isConnected || this.pendingEvents.length === 0) {
            return;
        }

        this.pendingEvents.forEach(event => {
            this.sendEvent(event);
        });

        this.pendingEvents = [];
    }

    sendEvent(eventData) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(eventData));
        } else {
            this.addPendingEvent(eventData);
        }
    }

    /* ===== UTILITAIRES ===== */

    updateSalesCounter(count) {
        const counter = document.getElementById('salesCounter');
        if (counter) {
            counter.textContent = count;
            counter.classList.add('pulse');
            setTimeout(() => counter.classList.remove('pulse'), 1000);
        }
    }

    updateCommissionDisplay(commission, bonus = 0) {
        const commissionElement = document.getElementById('currentCommission');
        if (commissionElement) {
            commissionElement.textContent = `${commission}%`;
            
            if (bonus > 0) {
                const bonusElement = document.createElement('span');
                bonusElement.className = 'commission-bonus';
                bonusElement.textContent = `+${bonus}%`;
                commissionElement.appendChild(bonusElement);
            }
        }
    }

    updateUnreadMessagesCount(count) {
        const badge = document.getElementById('unreadMessagesBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    playNotificationSound() {
        const audio = new Audio('/assets/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Ignorer les erreurs de lecture audio
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /* ===== ÉCOUTEURS D'ÉVÉNEMENTS ===== */

    setupEventListeners() {
        // Écouter la visibilité de la page
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.pendingEvents.length > 0) {
                this.flushPendingEvents();
            }
        });

        // Écouter les événements online/offline
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie');
            this.initWebSocket();
        });

        window.addEventListener('offline', () => {
            console.log('📵 Hors ligne');
            this.emit('connection.offline');
        });

        // Écouter les messages du Service Worker
        navigator.serviceWorker?.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event.data);
        });
    }

    handleServiceWorkerMessage(message) {
        if (message.type === 'NEW_EVENT') {
            this.processIncomingEvent(message.data);
        }
    }

    /* ===== METHODES PUBLIQUES ===== */

    // Envoyer un événement personnalisé
    sendCustomEvent(type, data) {
        this.sendEvent({
            type: type,
            data: data,
            timestamp: new Date(),
            source: 'client'
        });
    }

    // Vérifier l'état de connexion
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            lastEvent: this.eventHistory[0]
        };
    }

    // Nettoyer les ressources
    destroy() {
        if (this.socket) {
            this.socket.close();
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.eventHandlers.clear();
    }
}

/* ===== STYLES CSS DYNAMIQUES ===== */

const injectEventsStyles = () => {
    const styles = `
        .notification.toast {
            background: var(--surface-1);
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .notification.success {
            border-left: 4px solid var(--success);
        }
        
        .notification.info {
            border-left: 4px solid var(--info);
        }
        
        .notification.warning {
            border-left: 4px solid var(--warning);
        }
        
        .sale-animation {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1070;
            animation: floatUp 3s ease-in-out;
        }
        
        .sale-popup {
            background: linear-gradient(135deg, var(--success), var(--accent));
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .level-up-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1080;
            animation: fadeIn 0.5s ease-in;
        }
        
        .level-up-content {
            background: var(--surface-1);
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            border: 3px solid var(--accent);
        }
        
        .commission-bonus {
            background: var(--success);
            color: white;
            padding: 0.1rem 0.4rem;
            border-radius: 4px;
            font-size: 0.8em;
            margin-left: 0.5rem;
        }
        
        @keyframes floatUp {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            50% { transform: translate(-50%, -60%) scale(1.1); opacity: 1; }
            100% { transform: translate(-50%, -80%) scale(0.9); opacity: 0; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .pulse {
            animation: pulse 1s ease-in-out;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
};

/* ===== INITIALISATION ET EXPORT ===== */

// Instance globale
let eventsSystem = null;

// Initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    injectEventsStyles();
    eventsSystem = new EventsSystem();
    
    // Exposer globalement pour le débogage
    window.tradefyEvents = eventsSystem;
});

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventsSystem;
} else {
    window.EventsSystem = EventsSystem;
    window.eventsSystem = eventsSystem;
}