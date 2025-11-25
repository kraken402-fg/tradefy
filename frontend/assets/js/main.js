// frontend/js/main.js - VERSION CORRECTE POUR TRADEFY

class TradefyEventManager {
    constructor() {
        this.events = [];
        this.isAuthenticated = false;
        this.init();
    }
    
    async init() {
        this.checkAuth();
        await this.loadEvents();
        this.renderEvents();
        this.initEventInteractions();
        this.startAutoRefresh();
    }
    
    checkAuth() {
        this.isAuthenticated = !!localStorage.getItem('auth_token');
    }
    
    async loadEvents() {
        try {
            const endpoint = this.isAuthenticated ? 
                '/api/events/with-progress' : 
                '/api/events/active';
                
            const headers = {};
            if (this.isAuthenticated) {
                headers['Authorization'] = `Bearer ${this.getToken()}`;
            }
            
            const response = await fetch(endpoint, { headers });
            
            if (!response.ok) throw new Error('Erreur API');
            
            const data = await response.json();
            this.events = data.events || [];
            
            // Mettre à jour les compteurs
            this.updateStats(data.stats);
            
        } catch (error) {
            console.error('Erreur chargement événements:', error);
            this.showError('Impossible de charger les événements');
        }
    }
    
    renderEvents() {
        const container = document.getElementById('eventsContainer');
        if (!container) return;
        
        if (this.events.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }
        
        container.innerHTML = this.events.map(event => `
            <div class="col-lg-4" data-event-id="${event.id}" data-event-status="${event.status}">
                <div class="event-card card bg-surface-1 border-${event.color} h-100">
                    <div class="card-header bg-${event.color} text-dark d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas ${event.icon} me-2"></i>${event.title}
                        </h5>
                        <span class="badge bg-dark">${this.getStatusText(event.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="event-meta mb-3">
                            <div class="d-flex justify-content-between text-sm mb-2">
                                <span class="text-muted">
                                    <i class="fas fa-clock me-1"></i>
                                    ${event.time_remaining}
                                </span>
                                <span class="text-muted">
                                    <i class="fas fa-users me-1"></i>
                                    ${event.participants?.toLocaleString() || 0} participants
                                </span>
                            </div>
                            <div class="progress bg-surface-2" style="height: 6px;">
                                <div class="progress-bar bg-${event.color}" style="width: ${event.progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="commission-bonus mb-4">
                            <h6 class="text-accent mb-2">💰 Commission Bonus</h6>
                            <div class="bonus-display text-center p-3 rounded bg-surface-2">
                                <div class="h3 text-success mb-1">${event.bonus}</div>
                                <small class="text-muted">pendant ${event.duration}</small>
                            </div>
                        </div>
                        
                        ${this.renderLeaderSection(event)}
                        
                        <div class="event-description">
                            <p class="text-primary small mb-3">${event.description}</p>
                        </div>
                        
                        <div class="event-actions">
                            ${this.getActionButton(event)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderLeaderSection(event) {
        if (event.leaders && event.leaders.length > 0) {
            return `
                <div class="current-leader mb-3">
                    <h6 class="text-accent mb-2">🎯 Top 3 Actuel</h6>
                    <div class="leaderboard-mini">
                        ${event.leaders.map(leader => `
                            <div class="leader-item d-flex justify-content-between align-items-center mb-2 p-2 rounded bg-surface-2">
                                <div class="d-flex align-items-center">
                                    <span class="text-${this.getPositionColor(leader.position)} me-2">
                                        ${this.getPositionIcon(leader.position)}
                                    </span>
                                    <div class="avatar-placeholder ${leader.rank} me-2" 
                                         style="width: 30px; height: 30px; font-size: 0.8rem;">
                                        ${leader.name.charAt(0)}
                                    </div>
                                    <span class="vendor-name ${leader.rank}">${leader.name}</span>
                                </div>
                                <span class="text-success fw-bold">${leader.sales?.toLocaleString()} ventes</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (event.leader) {
            return `
                <div class="current-leader mb-3">
                    <h6 class="text-accent mb-2">🎯 Leader Actuel</h6>
                    <div class="d-flex align-items-center">
                        <div class="avatar-placeholder ${event.leader.rank} me-2" 
                             style="width: 30px; height: 30px; font-size: 0.8rem;">
                            ${event.leader.name.charAt(0)}
                        </div>
                        <div>
                            <span class="vendor-name ${event.leader.rank} fw-bold">${event.leader.name}</span>
                            <small class="text-muted d-block">${event.leader.sales} ventes</small>
                        </div>
                    </div>
                </div>
            `;
        }
        return '';
    }
    
    getActionButton(event) {
        if (!this.isAuthenticated) {
            return `
                <button class="btn btn-${event.color} w-100" onclick="location.href='login.html?return=events.html'">
                    <i class="fas fa-sign-in-alt me-2"></i>Se connecter pour participer
                </button>
            `;
        }
        
        return `
            <button class="btn btn-${event.color} w-100" onclick="tradefyEvents.viewEventProgress(${event.id})">
                <i class="fas fa-chart-line me-2"></i>Voir ma progression
            </button>
        `;
    }
    
    getEmptyState() {
        return `
            <div class="col-12 text-center py-5">
                <i class="fas fa-calendar-times fa-4x text-muted mb-3"></i>
                <h4 class="text-primary mb-2">Aucun événement actif</h4>
                <p class="text-muted">Revenez plus tard pour découvrir de nouveaux défis !</p>
            </div>
        `;
    }
    
    updateStats(stats) {
        if (stats) {
            if (stats.activeEvents !== undefined) {
                document.getElementById('activeEventsCount')?.textContent = stats.activeEvents;
            }
            if (stats.totalParticipants !== undefined) {
                document.getElementById('totalParticipants')?.textContent = stats.totalParticipants.toLocaleString();
            }
        }
    }
    
    initEventInteractions() {
        // Gestion des filtres
        const filterButtons = document.querySelectorAll('[data-filter]');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilter(e.target.getAttribute('data-filter'));
            });
        });
        
        // Gestion de la recherche
        const searchInput = document.getElementById('eventsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    }
    
    handleFilter(filter) {
        const events = document.querySelectorAll('[data-event-status]');
        events.forEach(event => {
            if (filter === 'all' || event.getAttribute('data-event-status') === filter) {
                event.style.display = 'block';
            } else {
                event.style.display = 'none';
            }
        });
    }
    
    handleSearch(term) {
        const events = document.querySelectorAll('[data-event-status]');
        const searchTerm = term.toLowerCase();
        
        events.forEach(event => {
            const title = event.querySelector('.card-header h5').textContent.toLowerCase();
            const description = event.querySelector('.event-description p').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                event.style.display = 'block';
            } else {
                event.style.display = 'none';
            }
        });
    }
    
    startAutoRefresh() {
        // Rafraîchissement toutes les 2 minutes pour éviter la surcharge
        setInterval(() => {
            this.loadEvents().then(() => this.renderEvents());
        }, 120000);
    }
    
    getToken() {
        return localStorage.getItem('auth_token');
    }
    
    getStatusText(status) {
        const statusMap = {
            'active': 'Actif',
            'upcoming': 'À venir',
            'ended': 'Terminé'
        };
        return statusMap[status] || status;
    }
    
    getPositionColor(position) {
        return position === 1 ? 'warning' : position === 2 ? 'secondary' : 'warning';
    }
    
    getPositionIcon(position) {
        return position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
    }
    
    showError(message) {
        // Implémentation basique d'affichage d'erreur
        console.error('Tradefy Error:', message);
        // Vous pouvez intégrer un système de notifications toast ici
    }
    
    // Méthode pour voir la progression détaillée
    viewEventProgress(eventId) {
        if (!this.isAuthenticated) {
            window.location.href = `login.html?return=events.html&event=${eventId}`;
            return;
        }
        window.location.href = `event-details.html?id=${eventId}`;
    }
}

// Initialisation globale
const tradefyEvents = new TradefyEventManager();

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TradefyEventManager };
}