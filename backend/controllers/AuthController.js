const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config, isProduction } = require('../config/platforms');
const User = require('../models/User');
const Security = require('../utils/Security');

class AuthController {
    constructor(db) {
        this.db = db;
        this.userModel = new User(db);
    }

    /**
     * Inscription d'un nouvel utilisateur
     */
    async register(userData) {
        try {
            // Validation des données
            const validation = this.validateRegistrationData(userData);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: validation.message,
                        code: 'VALIDATION_ERROR'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier si l'email existe déjà
            const existingUser = await this.userModel.findByEmail(userData.email);
            if (existingUser) {
                return {
                    success: false,
                    status: 409,
                    error: {
                        message: 'Cet email est déjà utilisé',
                        code: 'EMAIL_EXISTS'
                    },
                    timestamp: Date.now()
                };
            }

            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash(userData.password, 12);

            // Créer l'utilisateur
            const newUser = await this.userModel.create({
                email: userData.email,
                password: hashedPassword,
                username: userData.username,
                full_name: userData.full_name || userData.username,
                phone: userData.phone || null,
                role: 'vendor', // Par défaut, tous sont des vendeurs
                status: 'active',
                commission_rate: config.app.products.defaultCommission,
                created_at: new Date(),
                updated_at: new Date()
            });

            // Générer le JWT
            const token = this.generateToken(newUser);

            // Retourner la réponse sans le mot de passe
            const { password, ...userResponse } = newUser;

            return {
                success: true,
                status: 201,
                data: {
                    user: userResponse,
                    token: token,
                    message: 'Inscription réussie'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'REGISTRATION_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Connexion utilisateur
     */
    async login(loginData) {
        try {
            const { email, password } = loginData;

            // Validation
            if (!email || !password) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Email et mot de passe requis',
                        code: 'MISSING_CREDENTIALS'
                    },
                    timestamp: Date.now()
                };
            }

            // Trouver l'utilisateur
            const user = await this.userModel.findByEmail(email);
            if (!user) {
                return {
                    success: false,
                    status: 401,
                    error: {
                        message: 'Email ou mot de passe incorrect',
                        code: 'INVALID_CREDENTIALS'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier le statut
            if (user.status !== 'active') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Compte désactivé',
                        code: 'ACCOUNT_DISABLED'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier le mot de passe
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return {
                    success: false,
                    status: 401,
                    error: {
                        message: 'Email ou mot de passe incorrect',
                        code: 'INVALID_CREDENTIALS'
                    },
                    timestamp: Date.now()
                };
            }

            // Générer le token
            const token = this.generateToken(user);

            // Mettre à jour la dernière connexion
            await this.userModel.updateLastLogin(user.id);

            // Retourner la réponse sans le mot de passe
            const { password: _, ...userResponse } = user;

            return {
                success: true,
                status: 200,
                data: {
                    user: userResponse,
                    token: token,
                    message: 'Connexion réussie'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'LOGIN_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Rafraîchir le token
     */
    async refreshToken(userData) {
        try {
            // Vérifier que l'utilisateur existe toujours
            const user = await this.userModel.findById(userData.user_id);
            if (!user || user.status !== 'active') {
                return {
                    success: false,
                    status: 401,
                    error: {
                        message: 'Token invalide',
                        code: 'INVALID_TOKEN'
                    },
                    timestamp: Date.now()
                };
            }

            // Générer un nouveau token
            const token = this.generateToken(user);

            // Retourner la réponse sans le mot de passe
            const { password, ...userResponse } = user;

            return {
                success: true,
                status: 200,
                data: {
                    user: userResponse,
                    token: token,
                    message: 'Token rafraîchi'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'TOKEN_REFRESH_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir le profil utilisateur
     */
    async getProfile(userData) {
        try {
            const user = await this.userModel.findById(userData.user_id);
            if (!user) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Utilisateur non trouvé',
                        code: 'USER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            // Retourner sans le mot de passe
            const { password, ...userResponse } = user;

            return {
                success: true,
                status: 200,
                data: {
                    user: userResponse
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get profile error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'PROFILE_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Mettre à jour le profil
     */
    async updateProfile(userData, updateData) {
        try {
            // Validation des données
            const validation = this.validateUpdateData(updateData);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: validation.message,
                        code: 'VALIDATION_ERROR'
                    },
                    timestamp: Date.now()
                };
            }

            // Si email est modifié, vérifier qu'il n'existe pas déjà
            if (updateData.email && updateData.email !== userData.email) {
                const existingUser = await this.userModel.findByEmail(updateData.email);
                if (existingUser) {
                    return {
                        success: false,
                        status: 409,
                        error: {
                            message: 'Cet email est déjà utilisé',
                            code: 'EMAIL_EXISTS'
                        },
                        timestamp: Date.now()
                    };
                }
            }

            // Mettre à jour l'utilisateur
            const updatedUser = await this.userModel.update(userData.user_id, {
                ...updateData,
                updated_at: new Date()
            });

            // Retourner sans le mot de passe
            const { password, ...userResponse } = updatedUser;

            return {
                success: true,
                status: 200,
                data: {
                    user: userResponse,
                    message: 'Profil mis à jour'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'UPDATE_PROFILE_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Changer le mot de passe
     */
    async changePassword(userData, passwordData) {
        try {
            const { current_password, new_password, confirm_password } = passwordData;

            // Validation
            if (!current_password || !new_password || !confirm_password) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Tous les champs sont requis',
                        code: 'MISSING_FIELDS'
                    },
                    timestamp: Date.now()
                };
            }

            if (new_password !== confirm_password) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Les mots de passe ne correspondent pas',
                        code: 'PASSWORD_MISMATCH'
                    },
                    timestamp: Date.now()
                };
            }

            if (new_password.length < 8) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Le mot de passe doit contenir au moins 8 caractères',
                        code: 'PASSWORD_TOO_SHORT'
                    },
                    timestamp: Date.now()
                };
            }

            // Récupérer l'utilisateur avec mot de passe
            const user = await this.userModel.findById(userData.user_id);
            if (!user) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Utilisateur non trouvé',
                        code: 'USER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier le mot de passe actuel
            const isValidPassword = await bcrypt.compare(current_password, user.password);
            if (!isValidPassword) {
                return {
                    success: false,
                    status: 401,
                    error: {
                        message: 'Mot de passe actuel incorrect',
                        code: 'INVALID_CURRENT_PASSWORD'
                    },
                    timestamp: Date.now()
                };
            }

            // Hasher et mettre à jour le nouveau mot de passe
            const hashedNewPassword = await bcrypt.hash(new_password, 12);
            await this.userModel.updatePassword(userData.user_id, hashedNewPassword);

            return {
                success: true,
                status: 200,
                data: {
                    message: 'Mot de passe changé avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Change password error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'CHANGE_PASSWORD_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les informations de commission
     */
    async getCommissionInfo(userData) {
        try {
            const user = await this.userModel.findById(userData.user_id);
            if (!user) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Utilisateur non trouvé',
                        code: 'USER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            return {
                success: true,
                status: 200,
                data: {
                    commission_rate: user.commission_rate,
                    total_sales: user.total_sales || 0,
                    total_revenue: user.total_revenue || 0,
                    rank: user.rank || 'Bronze',
                    next_rank_threshold: this.getNextRankThreshold(user.rank)
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get commission info error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'COMMISSION_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Vérifier si l'utilisateur peut passer au rang supérieur
     */
    async checkRankUpgrade(userData) {
        try {
            const user = await this.userModel.findById(userData.user_id);
            if (!user) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Utilisateur non trouvé',
                        code: 'USER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            const currentRank = user.rank || 'Bronze';
            const nextRank = this.getNextRank(currentRank);
            const threshold = this.getNextRankThreshold(currentRank);
            const canUpgrade = user.total_sales >= threshold;

            return {
                success: true,
                status: 200,
                data: {
                    current_rank: currentRank,
                    next_rank: nextRank,
                    threshold: threshold,
                    current_sales: user.total_sales || 0,
                    can_upgrade: canUpgrade,
                    sales_needed: Math.max(0, threshold - (user.total_sales || 0))
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Check rank upgrade error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'RANK_CHECK_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir la liste des utilisateurs (admin seulement)
     */
    async getUsers(userData, filters = {}) {
        try {
            // Vérifier si l'utilisateur est admin
            if (userData.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            const users = await this.userModel.getAll(filters);

            // Retirer les mots de passe
            const usersResponse = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            return {
                success: true,
                status: 200,
                data: {
                    users: usersResponse,
                    total: usersResponse.length
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get users error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_USERS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Désactiver un utilisateur (admin seulement)
     */
    async deactivateUser(userData, targetUserId) {
        try {
            // Vérifier si l'utilisateur est admin
            if (userData.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            // Empêcher la désactivation de soi-même
            if (userData.user_id === targetUserId) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Vous ne pouvez pas désactiver votre propre compte',
                        code: 'SELF_DEACTIVATION'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier que l'utilisateur cible existe
            const targetUser = await this.userModel.findById(targetUserId);
            if (!targetUser) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Utilisateur non trouvé',
                        code: 'USER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            // Désactiver l'utilisateur
            await this.userModel.updateStatus(targetUserId, 'inactive');

            return {
                success: true,
                status: 200,
                data: {
                    message: 'Utilisateur désactivé avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Deactivate user error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'DEACTIVATE_USER_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    // ====================
    // 🔧 MÉTHODES PRIVÉES
    // ====================

    /**
     * Générer un token JWT
     */
    generateToken(user) {
        return jwt.sign(
            {
                user_id: user.id,
                email: user.email,
                role: user.role
            },
            config.security.jwtSecret,
            {
                algorithm: config.security.jwtAlgorithm,
                expiresIn: config.security.jwtExpiration
            }
        );
    }

    /**
     * Valider les données d'inscription
     */
    validateRegistrationData(data) {
        if (!data.email || !data.password || !data.username) {
            return {
                valid: false,
                message: 'Email, mot de passe et nom d\'utilisateur sont requis'
            };
        }

        if (!Security.isValidEmail(data.email)) {
            return {
                valid: false,
                message: 'Email invalide'
            };
        }

        if (data.password.length < 8) {
            return {
                valid: false,
                message: 'Le mot de passe doit contenir au moins 8 caractères'
            };
        }

        if (data.username.length < 3) {
            return {
                valid: false,
                message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères'
            };
        }

        return { valid: true };
    }

    /**
     * Valider les données de mise à jour
     */
    validateUpdateData(data) {
        if (data.email && !Security.isValidEmail(data.email)) {
            return {
                valid: false,
                message: 'Email invalide'
            };
        }

        if (data.username && data.username.length < 3) {
            return {
                valid: false,
                message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères'
            };
        }

        return { valid: true };
    }

    /**
     * Obtenir le prochain rang
     */
    getNextRank(currentRank) {
        const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
        const currentIndex = ranks.indexOf(currentRank);
        return currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : currentRank;
    }

    /**
     * Obtenir le seuil pour le prochain rang
     */
    getNextRankThreshold(currentRank) {
        const thresholds = {
            'Bronze': 50,
            'Silver': 200,
            'Gold': 500,
            'Platinum': 1000,
            'Diamond': 1000
        };
        return thresholds[currentRank] || 50;
    }
}

module.exports = AuthController;
