/**
 * Utilitaire de calcul des commissions
 */
class Commission {
    constructor() {
        // Taux de commission par rang (en centièmes de pourcentage)
        this.commissionRates = {
            'Bronze': 450,    // 4.5%
            'Silver': 425,    // 4.25%
            'Gold': 400,      // 4.0%
            'Platinum': 375,  // 3.75%
            'Diamond': 350,  // 3.5%
            'Magnat': 325,    // 3.25%
            'Senior': 300     // 3.0%
        };

        // Seuils de ventes pour chaque rang
        this.rankThresholds = {
            'Bronze': 0,
            'Silver': 20,
            'Gold': 50,
            'Platinum': 100,
            'Diamond': 250,
            'Magnat': 500,
            'Senior': 1000
        };
    }

    /**
     * Calculer la commission pour une vente
     */
    calculateCommission(amount, rank, quantity = 1) {
        try {
            // Obtenir le taux de commission pour le rang
            const rate = this.commissionRates[rank] || this.commissionRates['Bronze'];
            
            // Calculer la commission
            const commissionAmount = Math.round(amount * (rate / 10000));
            
            // Si quantité > 1, appliquer une réduction progressive
            let finalCommission = commissionAmount;
            if (quantity > 1) {
                const bulkDiscount = Math.min((quantity - 1) * 0.5, 2); // Max 2% de réduction
                finalCommission = Math.round(commissionAmount * (1 - bulkDiscount / 100));
            }

            return {
                amount: amount,
                rank: rank,
                rate: rate,
                commissionAmount: commissionAmount,
                finalCommission: finalCommission,
                quantity: quantity,
                bulkDiscount: quantity > 1 ? Math.round(commissionAmount - finalCommission) : 0
            };

        } catch (error) {
            console.error('Erreur lors du calcul de la commission:', error);
            return null;
        }
    }

    /**
     * Calculer la commission pour plusieurs ventes
     */
    calculateBulkCommission(sales) {
        try {
            const results = [];
            let totalCommission = 0;

            for (const sale of sales) {
                const commission = this.calculateCommission(sale.amount, sale.rank, sale.quantity || 1);
                if (commission) {
                    results.push(commission);
                    totalCommission += commission.finalCommission;
                }
            }

            return {
                sales: results,
                totalCommission: totalCommission,
                totalAmount: sales.reduce((sum, sale) => sum + sale.amount, 0),
                averageCommission: results.length > 0 ? Math.round(totalCommission / results.length) : 0
            };

        } catch (error) {
            console.error('Erreur lors du calcul de la commission groupée:', error);
            return null;
        }
    }

    /**
     * Mettre à jour le rang d'un utilisateur
     */
    updateRank(totalSales, currentRank) {
        try {
            // Déterminer le nouveau rang basé sur les ventes
            let newRank = 'Bronze';

            for (const [rank, threshold] of Object.entries(this.rankThresholds)) {
                if (totalSales >= threshold) {
                    newRank = rank;
                }
            }

            // Vérifier si le rang a changé
            const rankChanged = newRank !== currentRank;
            const commissionRate = this.commissionRates[newRank];

            return {
                currentRank: currentRank,
                newRank: newRank,
                rankChanged: rankChanged,
                commissionRate: commissionRate,
                totalSales: totalSales,
                nextRankThreshold: this.getNextRankThreshold(newRank),
                salesNeededForNextRank: this.getSalesNeededForNextRank(totalSales, newRank)
            };

        } catch (error) {
            console.error('Erreur lors de la mise à jour du rang:', error);
            return null;
        }
    }

    /**
     * Obtenir le seuil pour le rang suivant
     */
    getNextRankThreshold(currentRank) {
        const ranks = Object.keys(this.rankThresholds);
        const currentIndex = ranks.indexOf(currentRank);
        
        if (currentIndex < ranks.length - 1) {
            return this.rankThresholds[ranks[currentIndex + 1]];
        }
        
        return null; // Rang maximum atteint
    }

    /**
     * Calculer les ventes nécessaires pour le rang suivant
     */
    getSalesNeededForNextRank(totalSales, currentRank) {
        const nextThreshold = this.getNextRankThreshold(currentRank);
        
        if (nextThreshold === null) {
            return 0; // Rang maximum atteint
        }
        
        return Math.max(0, nextThreshold - totalSales);
    }

    /**
     * Calculer les revenus de commission pour une période
     */
    calculateCommissionRevenue(sales, period = 'month') {
        try {
            const periodMap = {
                'day': 1,
                'week': 7,
                'month': 30,
                'year': 365
            };

            const days = periodMap[period] || 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Filtrer les ventes par période
            const periodSales = sales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= cutoffDate;
            });

            // Calculer les commissions
            const bulkResult = this.calculateBulkCommission(periodSales);

            // Calculer les statistiques
            const stats = {
                period: period,
                totalSales: periodSales.length,
                totalAmount: bulkResult.totalAmount,
                totalCommission: bulkResult.totalCommission,
                averageCommission: bulkResult.averageCommission,
                averageOrderValue: periodSales.length > 0 ? Math.round(bulkResult.totalAmount / periodSales.length) : 0,
                commissionRate: bulkResult.totalAmount > 0 ? Math.round((bulkResult.totalCommission / bulkResult.totalAmount) * 10000) : 0
            };

            return stats;

        } catch (error) {
            console.error('Erreur lors du calcul des revenus de commission:', error);
            return null;
        }
    }

    /**
     * Obtenir les statistiques détaillées des commissions
     */
    getCommissionStats(sales, userRank) {
        try {
            // Calculs de base
            const bulkResult = this.calculateBulkCommission(sales);
            if (!bulkResult) {
                return null;
            }

            // Répartition par rang
            const rankStats = {};
            for (const sale of sales) {
                const rank = sale.rank || 'Bronze';
                if (!rankStats[rank]) {
                    rankStats[rank] = {
                        count: 0,
                        amount: 0,
                        commission: 0
                    };
                }
                rankStats[rank].count++;
                rankStats[rank].amount += sale.amount;
                
                const commission = this.calculateCommission(sale.amount, rank, sale.quantity || 1);
                if (commission) {
                    rankStats[rank].commission += commission.finalCommission;
                }
            }

            // Répartition par montant
            const amountRanges = [
                { name: '0-1000', min: 0, max: 1000 },
                { name: '1000-5000', min: 1000, max: 5000 },
                { name: '5000-10000', min: 5000, max: 10000 },
                { name: '10000-50000', min: 10000, max: 50000 },
                { name: '50000+', min: 50000, max: Infinity }
            ];

            const amountStats = {};
            for (const range of amountRanges) {
                amountStats[range.name] = {
                    count: 0,
                    amount: 0,
                    commission: 0
                };

                for (const sale of sales) {
                    if (sale.amount >= range.min && sale.amount < range.max) {
                        amountStats[range.name].count++;
                        amountStats[range.name].amount += sale.amount;
                        
                        const commission = this.calculateCommission(sale.amount, sale.rank || userRank, sale.quantity || 1);
                        if (commission) {
                            amountStats[range.name].commission += commission.finalCommission;
                        }
                    }
                }
            }

            // Tendances mensuelles
            const monthlyStats = this.calculateMonthlyTrends(sales);

            return {
                summary: {
                    totalSales: sales.length,
                    totalAmount: bulkResult.totalAmount,
                    totalCommission: bulkResult.totalCommission,
                    averageCommission: bulkResult.averageCommission,
                    averageOrderValue: sales.length > 0 ? Math.round(bulkResult.totalAmount / sales.length) : 0,
                    overallCommissionRate: bulkResult.totalAmount > 0 ? Math.round((bulkResult.totalCommission / bulkResult.totalAmount) * 10000) : 0
                },
                byRank: rankStats,
                byAmount: amountStats,
                monthlyTrends: monthlyStats,
                userRank: userRank,
                userCommissionRate: this.commissionRates[userRank] || 450
            };

        } catch (error) {
            console.error('Erreur lors du calcul des statistiques de commission:', error);
            return null;
        }
    }

    /**
     * Calculer les tendances mensuelles
     */
    calculateMonthlyTrends(sales) {
        try {
            const monthlyData = {};

            for (const sale of sales) {
                const saleDate = new Date(sale.date);
                const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        sales: 0,
                        amount: 0,
                        commission: 0
                    };
                }

                monthlyData[monthKey].sales++;
                monthlyData[monthKey].amount += sale.amount;
                
                const commission = this.calculateCommission(sale.amount, sale.rank || 'Bronze', sale.quantity || 1);
                if (commission) {
                    monthlyData[monthKey].commission += commission.finalCommission;
                }
            }

            // Trier par mois
            const sortedMonths = Object.keys(monthlyData).sort();
            return sortedMonths.map(month => monthlyData[month]);

        } catch (error) {
            console.error('Erreur lors du calcul des tendances mensuelles:', error);
            return [];
        }
    }

    /**
     * Calculer l'impact d'un changement de rang
     */
    calculateRankImpact(currentRank, newRank, monthlySales) {
        try {
            const currentRate = this.commissionRates[currentRank];
            const newRate = this.commissionRates[newRank];
            
            const currentCommission = this.calculateCommission(monthlySales, currentRank);
            const newCommission = this.calculateCommission(monthlySales, newRank);

            if (!currentCommission || !newCommission) {
                return null;
            }

            const difference = newCommission.finalCommission - currentCommission.finalCommission;
            const percentageChange = currentCommission.finalCommission > 0 
                ? Math.round((difference / currentCommission.finalCommission) * 100)
                : 0;

            return {
                currentRank: currentRank,
                newRank: newRank,
                currentRate: currentRate,
                newRate: newRate,
                monthlySales: monthlySales,
                currentCommission: currentCommission.finalCommission,
                newCommission: newCommission.finalCommission,
                difference: difference,
                percentageChange: percentageChange,
                annualImpact: difference * 12,
                rankUpgrade: newRate < currentRate
            };

        } catch (error) {
            console.error('Erreur lors du calcul de l\'impact du rang:', error);
            return null;
        }
    }

    /**
     * Simuler les commissions pour différents scénarios
     */
    simulateCommissionScenarios(baseAmount, currentRank, quantities = [1, 5, 10, 20]) {
        try {
            const scenarios = {};

            // Scénario de quantité
            scenarios.quantity = quantities.map(quantity => {
                const commission = this.calculateCommission(baseAmount, currentRank, quantity);
                return {
                    quantity: quantity,
                    commission: commission.finalCommission,
                    bulkDiscount: commission.bulkDiscount,
                    effectiveRate: Math.round((commission.finalCommission / (baseAmount * quantity)) * 10000)
                };
            });

            // Scénario de rang
            const ranks = Object.keys(this.commissionRates);
            scenarios.rank = ranks.map(rank => {
                const commission = this.calculateCommission(baseAmount, rank, 1);
                return {
                    rank: rank,
                    rate: commission.rate,
                    commission: commission.finalCommission,
                    savings: commission.finalCommission - scenarios.quantity[0].commission
                };
            });

            // Scénario de montant
            const amounts = [1000, 5000, 10000, 25000, 50000];
            scenarios.amount = amounts.map(amount => {
                const commission = this.calculateCommission(amount, currentRank, 1);
                return {
                    amount: amount,
                    commission: commission.finalCommission,
                    commissionRate: Math.round((commission.finalCommission / amount) * 10000)
                };
            });

            return scenarios;

        } catch (error) {
            console.error('Erreur lors de la simulation des commissions:', error);
            return null;
        }
    }

    /**
     * Obtenir les taux de commission actuels
     */
    getCommissionRates() {
        return { ...this.commissionRates };
    }

    /**
     * Obtenir les seuils de rang
     */
    getRankThresholds() {
        return { ...this.rankThresholds };
    }

    /**
     * Mettre à jour les taux de commission (admin seulement)
     */
    updateCommissionRates(newRates) {
        try {
            // Valider les nouveaux taux
            for (const [rank, rate] of Object.entries(newRates)) {
                if (typeof rate !== 'number' || rate < 100 || rate > 10000) {
                    throw new Error(`Taux invalide pour ${rank}: ${rate}. Doit être entre 100 et 10000`);
                }
            }

            // Mettre à jour les taux
            this.commissionRates = { ...newRates };
            
            return true;

        } catch (error) {
            console.error('Erreur lors de la mise à jour des taux de commission:', error);
            return false;
        }
    }

    /**
     * Calculer la commission nette (après frais de plateforme)
     */
    calculateNetCommission(grossCommission, platformFeeRate = 100) { // 1% par défaut
        try {
            const platformFee = Math.round(grossCommission * (platformFeeRate / 10000));
            const netCommission = grossCommission - platformFee;

            return {
                grossCommission: grossCommission,
                platformFeeRate: platformFeeRate,
                platformFee: platformFee,
                netCommission: netCommission,
                effectiveRate: Math.round((netCommission / grossCommission) * 10000)
            };

        } catch (error) {
            console.error('Erreur lors du calcul de la commission nette:', error);
            return null;
        }
    }

    /**
     * Générer un rapport de commission
     */
    generateCommissionReport(sales, userRank, period = 'month') {
        try {
            const stats = this.getCommissionStats(sales, userRank);
            const revenue = this.calculateCommissionRevenue(sales, period);
            const rankInfo = this.updateRank(
                sales.reduce((sum, sale) => sum + 1, 0), // Total des ventes
                userRank
            );

            return {
                period: period,
                generatedAt: new Date(),
                userRank: userRank,
                stats: stats,
                revenue: revenue,
                rankInfo: rankInfo,
                recommendations: this.generateRecommendations(stats, rankInfo)
            };

        } catch (error) {
            console.error('Erreur lors de la génération du rapport:', error);
            return null;
        }
    }

    /**
     * Générer des recommandations basées sur les statistiques
     */
    generateRecommendations(stats, rankInfo) {
        const recommendations = [];

        // Recommandation de rang
        if (rankInfo.rankChanged) {
            recommendations.push({
                type: 'rank_upgrade',
                title: `Promotion au rang ${rankInfo.newRank}!`,
                message: `Félicitations! Votre taux de commission passe à ${rankInfo.commissionRate / 100}%.`,
                impact: `Économie de ${this.commissionRates[rankInfo.currentRank] - rankInfo.commissionRate} points de base par vente.`
            });
        } else if (rankInfo.salesNeededForNextRank > 0) {
            recommendations.push({
                type: 'rank_goal',
                title: `Objectif de rang ${this.getNextRankThreshold(rankInfo.currentRank) ? Object.keys(this.rankThresholds)[Object.keys(this.rankThresholds).indexOf(rankInfo.currentRank) + 1] : 'Maximum'}`,
                message: `Il vous faut ${rankInfo.salesNeededForNextRank} ventes supplémentaires pour atteindre le rang suivant.`,
                impact: `Taux de commission réduit à ${this.getNextRankThreshold(rankInfo.currentRank) ? this.commissionRates[Object.keys(this.rankThresholds)[Object.keys(this.rankThresholds).indexOf(rankInfo.currentRank) + 1]] / 100 : 'N/A'}%.`
            });
        }

        // Recommandation de volume
        if (stats && stats.summary.totalSales < 10) {
            recommendations.push({
                type: 'volume',
                title: 'Augmentez votre volume de ventes',
                message: 'Avec plus de ventes, vous pourriez bénéficier de réductions sur les commissions groupées.',
                impact: 'Les ventes en volume peuvent réduire les commissions de jusqu\'à 2%.'
            });
        }

        // Recommandation de prix
        if (stats && stats.summary.averageOrderValue < 5000) {
            recommendations.push({
                type: 'pricing',
                title: 'Optimisez vos prix',
                message: 'Des commandes de plus grande valeur peuvent générer plus de commissions.',
                impact: 'Augmentez la valeur moyenne des commandes pour maximiser vos revenus.'
            });
        }

        return recommendations;
    }
}

module.exports = Commission;
