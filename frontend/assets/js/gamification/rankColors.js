/*!
 * Tradefy v3 - Rank Colors System
 * Gestion des couleurs, thèmes et styles des rangs de vendeurs
 * By Charbelus
 */

class RankColorsSystem {
    constructor() {
        this.rankConfig = this.getRankConfig();
        this.currentTheme = 'light';
        this.customColors = new Map();
        this.cssVariables = new Map();
        
        this.init();
    }

    init() {
        this.injectGlobalStyles();
        this.setupThemeListener();
        this.loadCustomColors();
        this.applyRankColors();
    }

    /* ===== CONFIGURATION DES COULEURS DES RANGS ===== */

    getRankConfig() {
        return {
            'profane': {
                name: 'Profane',
                colors: {
                    light: {
                        primary: '#6c757d',
                        secondary: '#f8f9fa',
                        accent: '#495057',
                        gradient: 'linear-gradient(135deg, #6c757d 0%, #868e96 100%)',
                        text: '#ffffff',
                        shadow: '0 2px 8px rgba(108, 117, 125, 0.3)'
                    },
                    dark: {
                        primary: '#5a6268',
                        secondary: '#2d3338',
                        accent: '#7a8288',
                        gradient: 'linear-gradient(135deg, #5a6268 0%, #6c757d 100%)',
                        text: '#f8f9fa',
                        shadow: '0 2px 8px rgba(90, 98, 104, 0.5)'
                    }
                },
                icon: '🔰',
                level: 0
            },
            'debutant': {
                name: 'Débutant',
                colors: {
                    light: {
                        primary: '#28a745',
                        secondary: '#d4edda',
                        accent: '#1e7e34',
                        gradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        text: '#ffffff',
                        shadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
                    },
                    dark: {
                        primary: '#218838',
                        secondary: '#155724',
                        accent: '#34ce57',
                        gradient: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
                        text: '#f8f9fa',
                        shadow: '0 2px 8px rgba(33, 136, 56, 0.5)'
                    }
                },
                icon: '🚀',
                level: 1
            },
            'marchand': {
                name: 'Marchand',
                colors: {
                    light: {
                        primary: '#17a2b8',
                        secondary: '#d1ecf1',
                        accent: '#138496',
                        gradient: 'linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%)',
                        text: '#ffffff',
                        shadow: '0 2px 8px rgba(23, 162, 184, 0.3)'
                    },
                    dark: {
                        primary: '#138496',
                        secondary: '#0c5460',
                        accent: '#3dd5f3',
                        gradient: 'linear-gradient(135deg, #138496 0%, #0c5460 100%)',
                        text: '#f8f9fa',
                        shadow: '0 2px 8px rgba(19, 132, 150, 0.5)'
                    }
                },
                icon: '📈',
                level: 2
            },
            'negociant': {
                name: 'Négociant',
                colors: {
                    light: {
                        primary: '#ffc107',
                        secondary: '#fff3cd',
                        accent: '#e0a800',
                        gradient: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                        text: '#212529',
                        shadow: '0 2px 8px rgba(255, 193, 7, 0.3)'
                    },
                    dark: {
                        primary: '#e0a800',
                        secondary: '#856404',
                        accent: '#ffda6a',
                        gradient: 'linear-gradient(135deg, #e0a800 0%, #b38f00 100%)',
                        text: '#212529',
                        shadow: '0 2px 8px rgba(224, 168, 0, 0.5)'
                    }
                },
                icon: '🔥',
                level: 3
            },
            'courtier': {
                name: 'Courtier',
                colors: {
                    light: {
                        primary: '#fd7e14',
                        secondary: '#ffe5d0',
                        accent: '#dc6502',
                        gradient: 'linear-gradient(135deg, #fd7e14 0%, #e95c2a 100%)',
                        text: '#ffffff',
                        shadow: '0 2px 8px rgba(253, 126, 20, 0.3)'
                    },
                    dark: {
                        primary: '#dc6502',
                        secondary: '#8b4513',
                        accent: '#ff9547',
                        gradient: 'linear-gradient(135deg, #dc6502 0%, #b35202 100%)',
                        text: '#f8f9fa',
                        shadow: '0 2px 8px rgba(220, 101, 2, 0.5)'
                    }
                },
                icon: '💎',
                level: 4
            },
            'magnat': {
                name: 'Magnat',
                colors: {
                    light: {
                        primary: '#dc3545',
                        secondary: '#f8d7da',
                        accent: '#c82333',
                        gradient: 'linear-gradient(135deg, #dc3545 0%, #a71e2a 100%)',
                        text: '#ffffff',
                        shadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
                    },
                    dark: {
                        primary: '#c82333',
                        secondary: '#721c24',
                        accent: '#e4606d',
                        gradient: 'linear-gradient(135deg, #c82333 0%, #a71e2a 100%)',
                        text: '#f8f9fa',
                        shadow: '0 2px 8px rgba(200, 35, 51, 0.5)'
                    }
                },
                icon: '🏆',
                level: 5
            },
            'senior': {
                name: 'Senior',
                colors: {
                    light: {
                        primary: '#6f42c1',
                        secondary: '#e2e3f3',
                        accent: '#5a32a3',
                        gradient: 'linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%)',
                        text: '#ffffff',
                        shadow: '0 2px 8px rgba(111, 66, 193, 0.3)'
                    },
                    dark: {
                        primary: '#5a32a3',
                        secondary: '#2d1b69',
                        accent: '#9d7ce6',
                        gradient: 'linear-gradient(135deg, #5a32a3 0%, #45278b 100%)',
                        text: '#f8f9fa',
                        shadow: '0 2px 8px rgba(90, 50, 163, 0.5)'
                    }
                },
                icon: '👑',
                level: 6
            }
        };
    }

    /* ===== APPLICATION DES COULEURS ===== */

    applyRankColors() {
        this.generateCSSVariables();
        this.updateRankElements();
        this.applyRankGradients();
    }

    generateCSSVariables() {
        const variables = {};
        
        Object.entries(this.rankConfig).forEach(([rank, config]) => {
            const colors = config.colors[this.currentTheme];
            
            variables[`--rank-${rank}-primary`] = colors.primary;
            variables[`--rank-${rank}-secondary`] = colors.secondary;
            variables[`--rank-${rank}-accent`] = colors.accent;
            variables[`--rank-${rank}-gradient`] = colors.gradient;
            variables[`--rank-${rank}-text`] = colors.text;
            variables[`--rank-${rank}-shadow`] = colors.shadow;
            
            // Variables simplifiées pour les classes utilitaires
            variables[`--color-${rank}`] = colors.primary;
        });

        this.cssVariables = new Map(Object.entries(variables));
        this.injectCSSVariables();
    }

    injectCSSVariables() {
        const styleId = 'rank-colors-variables';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        const cssRules = [':root {'];
        this.cssVariables.forEach((value, variable) => {
            cssRules.push(`  ${variable}: ${value};`);
        });
        cssRules.push('}');
        
        styleElement.textContent = cssRules.join('\n');
    }

    updateRankElements() {
        // Mettre à jour tous les éléments avec des attributs data-rank
        const rankElements = document.querySelectorAll('[data-rank]');
        
        rankElements.forEach(element => {
            const rank = element.dataset.rank;
            this.applyRankStyles(element, rank);
        });
        
        // Mettre à jour les éléments avec des classes de rang
        Object.keys(this.rankConfig).forEach(rank => {
            const elements = document.querySelectorAll(`.rank-${rank}, .bg-${rank}`);
            elements.forEach(element => {
                this.applyRankStyles(element, rank);
            });
        });
    }

    applyRankStyles(element, rank) {
        if (!this.rankConfig[rank]) return;
        
        const colors = this.rankConfig[rank].colors[this.currentTheme];
        const config = this.rankConfig[rank];
        
        // Appliquer les styles selon le type d'élément
        if (element.classList.contains('bg-' + rank)) {
            element.style.background = colors.primary;
            element.style.color = colors.text;
        }
        
        if (element.classList.contains('text-' + rank)) {
            element.style.color = colors.primary;
        }
        
        if (element.classList.contains('border-' + rank)) {
            element.style.borderColor = colors.primary;
        }
        
        if (element.classList.contains('badge-' + rank)) {
            this.styleRankBadge(element, colors);
        }
        
        if (element.classList.contains('card-' + rank)) {
            this.styleRankCard(element, colors);
        }
        
        // Appliquer les attributs data
        if (element.dataset.rankStyle === 'badge') {
            this.styleRankBadge(element, colors);
        } else if (element.dataset.rankStyle === 'card') {
            this.styleRankCard(element, colors);
        } else if (element.dataset.rankStyle === 'gradient') {
            this.styleRankGradient(element, colors);
        }
    }

    styleRankBadge(element, colors) {
        element.style.background = colors.primary;
        element.style.color = colors.text;
        element.style.border = 'none';
        element.style.padding = '0.5rem 1rem';
        element.style.borderRadius = '50px';
        element.style.fontWeight = 'bold';
        element.style.boxShadow = colors.shadow;
        element.style.display = 'inline-flex';
        element.style.alignItems = 'center';
        element.style.gap = '0.5rem';
    }

    styleRankCard(element, colors) {
        element.style.background = colors.secondary;
        element.style.border = `2px solid ${colors.primary}`;
        element.style.borderRadius = '12px';
        element.style.boxShadow = colors.shadow;
        element.style.overflow = 'hidden';
    }

    styleRankGradient(element, colors) {
        element.style.background = colors.gradient;
        element.style.color = colors.text;
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
    }

    applyRankGradients() {
        const gradientElements = document.querySelectorAll('[data-rank-gradient]');
        
        gradientElements.forEach(element => {
            const rank = element.dataset.rankGradient;
            const colors = this.rankConfig[rank]?.colors[this.currentTheme];
            
            if (colors) {
                element.style.background = colors.gradient;
                element.style.color = colors.text;
            }
        });
    }

    /* ===== GESTION DES THÈMES ===== */

    setupThemeListener() {
        // Écouter les changements de thème
        const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        this.handleThemeChange(themeMedia);
        themeMedia.addListener(this.handleThemeChange.bind(this));
        
        // Écouter les changements de thème personnalisés
        document.addEventListener('themeChanged', (event) => {
            this.currentTheme = event.detail.theme;
            this.applyRankColors();
        });
    }

    handleThemeChange(mediaQuery) {
        this.currentTheme = mediaQuery.matches ? 'dark' : 'light';
        this.applyRankColors();
        
        this.emit('themeChanged', {
            theme: this.currentTheme,
            system: mediaQuery.matches
        });
    }

    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.currentTheme = theme;
            this.applyRankColors();
            
            this.emit('themeChanged', {
                theme: this.currentTheme,
                system: false
            });
        }
    }

    toggleTheme() {
        this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
    }

    /* ===== COULEURS PERSONNALISÉES ===== */

    loadCustomColors() {
        try {
            const saved = localStorage.getItem('tradefy_custom_colors');
            if (saved) {
                this.customColors = new Map(JSON.parse(saved));
                this.applyCustomColors();
            }
        } catch (error) {
            console.warn('Erreur chargement couleurs personnalisées:', error);
        }
    }

    saveCustomColors() {
        try {
            const data = JSON.stringify(Array.from(this.customColors.entries()));
            localStorage.setItem('tradefy_custom_colors', data);
        } catch (error) {
            console.warn('Erreur sauvegarde couleurs personnalisées:', error);
        }
    }

    setCustomColor(rank, colorType, value) {
        if (!this.customColors.has(rank)) {
            this.customColors.set(rank, {});
        }
        
        const rankColors = this.customColors.get(rank);
        rankColors[colorType] = value;
        
        this.applyCustomColors();
        this.saveCustomColors();
    }

    applyCustomColors() {
        this.customColors.forEach((colors, rank) => {
            if (this.rankConfig[rank]) {
                Object.entries(colors).forEach(([type, value]) => {
                    const variable = `--rank-${rank}-${type}`;
                    this.cssVariables.set(variable, value);
                });
            }
        });
        
        this.injectCSSVariables();
        this.updateRankElements();
    }

    resetCustomColors(rank = null) {
        if (rank) {
            this.customColors.delete(rank);
        } else {
            this.customColors.clear();
        }
        
        this.applyRankColors();
        this.saveCustomColors();
    }

    /* ===== GÉNÉRATION DE COULEURS ===== */

    generateRankGradient(rank, angle = 135) {
        const colors = this.rankConfig[rank]?.colors[this.currentTheme];
        if (!colors) return '';
        
        return `linear-gradient(${angle}deg, ${colors.primary} 0%, ${colors.accent} 100%)`;
    }

    generateRankShadow(rank, intensity = 1) {
        const colors = this.rankConfig[rank]?.colors[this.currentTheme];
        if (!colors) return '';
        
        const color = colors.primary.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        return `0 4px 16px rgba(${r}, ${g}, ${b}, ${0.3 * intensity})`;
    }

    getContrastColor(hexColor) {
        // Convertir hex en RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        // Calculer la luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#212529' : '#f8f9fa';
    }

    /* ===== CLASSES UTILITAIRES ===== */

    getRankUtilityClasses() {
        const classes = {};
        
        Object.keys(this.rankConfig).forEach(rank => {
            classes[`.bg-${rank}`] = {
                'background-color': `var(--rank-${rank}-primary)`,
                'color': `var(--rank-${rank}-text)`
            };
            
            classes[`.text-${rank}`] = {
                'color': `var(--rank-${rank}-primary)`
            };
            
            classes[`.border-${rank}`] = {
                'border-color': `var(--rank-${rank}-primary)`
            };
            
            classes[`.badge-${rank}`] = {
                'background': `var(--rank-${rank}-primary)`,
                'color': `var(--rank-${rank}-text)`,
                'border': 'none',
                'padding': '0.5rem 1rem',
                'border-radius': '50px',
                'font-weight': 'bold',
                'box-shadow': `var(--rank-${rank}-shadow)`,
                'display': 'inline-flex',
                'align-items': 'center',
                'gap': '0.5rem'
            };
            
            classes[`.gradient-${rank}`] = {
                'background': `var(--rank-${rank}-gradient)`,
                'color': `var(--rank-${rank}-text)`,
                'position': 'relative',
                'overflow': 'hidden'
            };
        });
        
        return classes;
    }

    injectUtilityClasses() {
        const styleId = 'rank-utility-classes';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        const classes = this.getRankUtilityClasses();
        const cssRules = [];
        
        Object.entries(classes).forEach(([selector, properties]) => {
            const rule = [`${selector} {`];
            Object.entries(properties).forEach(([property, value]) => {
                rule.push(`  ${property}: ${value};`);
            });
            rule.push('}');
            cssRules.push(rule.join('\n'));
        });
        
        styleElement.textContent = cssRules.join('\n');
    }

    /* ===== MÉTHODES D'ASSISTANCE ===== */

    getRankInfo(rank) {
        return this.rankConfig[rank] || null;
    }

    getRankColor(rank, colorType = 'primary') {
        const config = this.rankConfig[rank];
        if (!config) return null;
        
        return config.colors[this.currentTheme][colorType];
    }

    getAllRanks() {
        return Object.keys(this.rankConfig);
    }

    getNextRank(currentRank) {
        const ranks = this.getAllRanks();
        const currentIndex = ranks.indexOf(currentRank);
        
        return currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;
    }

    getPreviousRank(currentRank) {
        const ranks = this.getAllRanks();
        const currentIndex = ranks.indexOf(currentRank);
        
        return currentIndex > 0 ? ranks[currentIndex - 1] : null;
    }

    getRankByLevel(level) {
        return Object.entries(this.rankConfig).find(([_, config]) => config.level === level)?.[0] || null;
    }

    /* ===== ÉMISSION D'ÉVÉNEMENTS ===== */

    emit(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
    }

    /* ===== INITIALISATION ET EXPORT ===== */

    static getInstance() {
        if (!RankColorsSystem.instance) {
            RankColorsSystem.instance = new RankColorsSystem();
        }
        return RankColorsSystem.instance;
    }
}

// Instance globale
let rankColorsSystem = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    rankColorsSystem = RankColorsSystem.getInstance();
    
    // Exposer globalement pour le débogage
    window.tradefyColors = rankColorsSystem;
});

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RankColorsSystem;
} else {
    window.RankColorsSystem = RankColorsSystem;
}