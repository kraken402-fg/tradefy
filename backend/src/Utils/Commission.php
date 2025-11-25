<?php

namespace Tradefy\Utils;

use Tradefy\Config\Settings;

class Commission
{
    /**
     * Calcule la commission pour une vente selon le rang du vendeur
     */
    public static function calculateSaleCommission(int $salesCount, float $saleAmount): array
    {
        $rank = Settings::getRank($salesCount);
        $commissionData = Settings::calculateCommission($salesCount, $saleAmount);
        
        // Calcul de la récompense de quête si applicable
        $questBonus = self::calculateQuestBonus($rank, $salesCount, $saleAmount);
        
        return [
            'rank' => $rank,
            'sale_amount' => $saleAmount,
            'commission_rate' => $commissionData['commission_rate'],
            'commission_amount' => $commissionData['commission_amount'],
            'vendor_amount' => $commissionData['vendor_amount'],
            'quest_bonus' => $questBonus,
            'total_vendor_amount' => $commissionData['vendor_amount'] + $questBonus,
            'platform_fee' => $commissionData['commission_amount'] - $questBonus
        ];
    }

    /**
     * Calcule la récompense de quête selon la formule exacte
     */
    public static function calculateQuestBonus(string $currentRank, int $currentSales, float $saleAmount): float
    {
        $questParams = Settings::getQuestParameters($currentRank, $currentSales);
        
        if (!$questParams || !$questParams['completed']) {
            return 0.0;
        }

        // Bonus de quête selon le rang (en bps)
        $questBonusRates = [
            'profane' => 500,
            'debutant' => 600, 
            'marchand' => 700,
            'negociant' => 800,
            'courtier' => 900,
            'magnat' => 1000
        ];

        $bonusRate = $questBonusRates[$currentRank] ?? 0;
        return ($saleAmount * $bonusRate) / 10000;
    }

    /**
     * Vérifie si le vendeur peut monter de rang
     */
    public static function canRankUp(string $currentRank, int $totalSales): bool
    {
        $nextRank = self::getNextRank($currentRank);
        
        if (!$nextRank) {
            return false; // Déjà au rang maximum
        }

        $nextRankMinSales = self::getRankMinSales($nextRank);
        return $totalSales >= $nextRankMinSales;
    }

    /**
     * Retourne le rang suivant
     */
    public static function getNextRank(string $currentRank): ?string
    {
        $ranks = ['profane', 'debutant', 'marchand', 'negociant', 'courtier', 'magnat', 'senior'];
        $currentIndex = array_search($currentRank, $ranks);
        
        return ($currentIndex !== false && isset($ranks[$currentIndex + 1])) 
            ? $ranks[$currentIndex + 1] 
            : null;
    }

    /**
     * Retourne le rang précédent
     */
    public static function getPreviousRank(string $currentRank): ?string
    {
        $ranks = ['profane', 'debutant', 'marchand', 'negociant', 'courtier', 'magnat', 'senior'];
        $currentIndex = array_search($currentRank, $ranks);
        
        return ($currentIndex !== false && $currentIndex > 0) 
            ? $ranks[$currentIndex - 1] 
            : null;
    }

    /**
     * Retourne les ventes minimum requises pour un rang
     */
    public static function getRankMinSales(string $rank): int
    {
        $rankData = self::getRankData($rank);
        return $rankData['min_sales'] ?? 0;
    }

    /**
     * Retourne les ventes maximum pour un rang
     */
    public static function getRankMaxSales(string $rank): ?int
    {
        $rankData = self::getRankData($rank);
        return $rankData['max_sales'] ?? null;
    }

    /**
     * Retourne le taux de commission pour un rang
     */
    public static function getRankCommissionRate(string $rank): int
    {
        $rankData = self::getRankData($rank);
        return $rankData['commission'] ?? Settings::getDefaultCommission();
    }

    /**
     * Récupère toutes les données d'un rang
     */
    public static function getRankData(string $rank): array
    {
        $allRanks = self::getAllRanks();
        return $allRanks[$rank] ?? [];
    }

    /**
     * Retourne tous les rangs et leurs données
     */
    public static function getAllRanks(): array
    {
        return [
            'profane' => ['min_sales' => 0, 'max_sales' => 24, 'commission' => 450],
            'debutant' => ['min_sales' => 25, 'max_sales' => 74, 'commission' => 425],
            'marchand' => ['min_sales' => 75, 'max_sales' => 227, 'commission' => 400],
            'negociant' => ['min_sales' => 228, 'max_sales' => 554, 'commission' => 375],
            'courtier' => ['min_sales' => 555, 'max_sales' => 1004, 'commission' => 350],
            'magnat' => ['min_sales' => 1005, 'max_sales' => 2849, 'commission' => 325],
            'senior' => ['min_sales' => 2850, 'max_sales' => null, 'commission' => 300]
        ];
    }

    /**
     * Calcule les statistiques détaillées pour un vendeur
     */
    public static function calculateVendorStats(int $totalSales, float $totalRevenue): array
    {
        $currentRank = Settings::getRank($totalSales);
        $nextRank = self::getNextRank($currentRank);
        $questParams = Settings::getQuestParameters($currentRank, $totalSales);
        
        $stats = [
            'current_rank' => $currentRank,
            'total_sales' => $totalSales,
            'total_revenue' => $totalRevenue,
            'current_commission_rate' => self::getRankCommissionRate($currentRank),
            'next_rank' => $nextRank,
            'quest' => $questParams
        ];

        // Calculs pour la progression vers le rang suivant
        if ($nextRank) {
            $nextRankMinSales = self::getRankMinSales($nextRank);
            $salesNeeded = $nextRankMinSales - $totalSales;
            $progressPercentage = $nextRankMinSales > 0 
                ? min(100, ($totalSales / $nextRankMinSales) * 100) 
                : 0;

            $stats['rank_progression'] = [
                'next_rank' => $nextRank,
                'sales_needed' => max(0, $salesNeeded),
                'progress_percentage' => round($progressPercentage, 2),
                'next_rank_commission_rate' => self::getRankCommissionRate($nextRank)
            ];
        }

        return $stats;
    }

    /**
     * Simule les gains pour un nombre de ventes donné
     */
    public static function simulateEarnings(int $currentSales, float $averageSalePrice, int $projectedSales): array
    {
        $results = [];
        $totalProjectedRevenue = 0;
        $totalProjectedCommission = 0;
        $totalProjectedVendorEarnings = 0;

        for ($i = 0; $i < $projectedSales; $i++) {
            $simulatedSales = $currentSales + $i;
            $commissionData = self::calculateSaleCommission($simulatedSales, $averageSalePrice);
            
            $results[] = [
                'sale_number' => $simulatedSales + 1,
                'rank' => $commissionData['rank'],
                'sale_amount' => $averageSalePrice,
                'commission_rate' => $commissionData['commission_rate'],
                'vendor_earnings' => $commissionData['total_vendor_amount'],
                'platform_fee' => $commissionData['platform_fee'],
                'quest_bonus' => $commissionData['quest_bonus']
            ];

            $totalProjectedRevenue += $averageSalePrice;
            $totalProjectedCommission += $commissionData['platform_fee'];
            $totalProjectedVendorEarnings += $commissionData['total_vendor_amount'];
        }

        return [
            'simulation_details' => $results,
            'summary' => [
                'projected_sales' => $projectedSales,
                'total_projected_revenue' => round($totalProjectedRevenue, 2),
                'total_projected_vendor_earnings' => round($totalProjectedVendorEarnings, 2),
                'total_projected_platform_fees' => round($totalProjectedCommission, 2),
                'average_commission_rate' => $totalProjectedRevenue > 0 
                    ? round(($totalProjectedCommission / $totalProjectedRevenue) * 10000) 
                    : 0
            ]
        ];
    }

    /**
     * Valide si un prix de produit est acceptable
     */
    public static function validateProductPrice(float $price): array
    {
        $minPrice = Settings::getMinProductPrice();
        $maxPrice = Settings::getMaxProductPrice();
        
        $errors = [];
        
        if ($price < $minPrice) {
            $errors[] = "Le prix minimum est " . $minPrice;
        }
        
        if ($price > $maxPrice) {
            $errors[] = "Le prix maximum est " . $maxPrice;
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'min_price' => $minPrice,
            'max_price' => $maxPrice
        ];
    }

    /**
     * Format un montant en bps pour l'affichage
     */
    public static function formatBps(int $bps): string
    {
        $percentage = $bps / 100;
        return "{$bps} bps ({$percentage}%)";
    }

    /**
     * Calcule le revenu estimé après commissions
     */
    public static function calculateEstimatedRevenue(float $productPrice, int $expectedSales, int $currentSales = 0): array
    {
        $totalRevenue = 0;
        $totalVendorEarnings = 0;
        $totalPlatformFees = 0;
        
        $simulation = self::simulateEarnings($currentSales, $productPrice, $expectedSales);
        
        foreach ($simulation['simulation_details'] as $sale) {
            $totalRevenue += $sale['sale_amount'];
            $totalVendorEarnings += $sale['vendor_earnings'];
            $totalPlatformFees += $sale['platform_fee'];
        }

        return [
            'total_revenue' => round($totalRevenue, 2),
            'total_vendor_earnings' => round($totalVendorEarnings, 2),
            'total_platform_fees' => round($totalPlatformFees, 2),
            'average_commission_rate' => $totalRevenue > 0 
                ? round(($totalPlatformFees / $totalRevenue) * 10000)
                : 0,
            'details_by_rank' => self::groupEarningsByRank($simulation['simulation_details'])
        ];
    }

    /**
     * Groupe les gains par rang pour l'analyse
     */
    private static function groupEarningsByRank(array $salesData): array
    {
        $grouped = [];
        
        foreach ($salesData as $sale) {
            $rank = $sale['rank'];
            
            if (!isset($grouped[$rank])) {
                $grouped[$rank] = [
                    'rank' => $rank,
                    'sales_count' => 0,
                    'total_revenue' => 0,
                    'total_vendor_earnings' => 0,
                    'total_platform_fees' => 0
                ];
            }
            
            $grouped[$rank]['sales_count']++;
            $grouped[$rank]['total_revenue'] += $sale['sale_amount'];
            $grouped[$rank]['total_vendor_earnings'] += $sale['vendor_earnings'];
            $grouped[$rank]['total_platform_fees'] += $sale['platform_fee'];
        }

        // Arrondir les totaux
        foreach ($grouped as &$data) {
            $data['total_revenue'] = round($data['total_revenue'], 2);
            $data['total_vendor_earnings'] = round($data['total_vendor_earnings'], 2);
            $data['total_platform_fees'] = round($data['total_platform_fees'], 2);
        }

        return array_values($grouped);
    }

    /**
     * Génère un rapport de performance pour un vendeur
     */
    public static function generatePerformanceReport(int $totalSales, float $totalRevenue, array $recentSales = []): array
    {
        $currentRank = Settings::getRank($totalSales);
        $rankData = self::getRankData($currentRank);
        $nextRank = self::getNextRank($currentRank);
        $questParams = Settings::getQuestParameters($currentRank, $totalSales);

        $report = [
            'current_rank' => $currentRank,
            'total_sales' => $totalSales,
            'total_revenue' => $totalRevenue,
            'average_sale_value' => $totalSales > 0 ? round($totalRevenue / $totalSales, 2) : 0,
            'current_commission_rate' => self::getRankCommissionRate($currentRank),
            'rank_progress' => [],
            'quest_status' => $questParams,
            'next_milestones' => []
        ];

        // Progression vers le rang suivant
        if ($nextRank) {
            $nextRankMinSales = self::getRankMinSales($nextRank);
            $salesToNextRank = max(0, $nextRankMinSales - $totalSales);
            
            $report['rank_progress'] = [
                'next_rank' => $nextRank,
                'sales_needed' => $salesToNextRank,
                'progress_percentage' => $nextRankMinSales > 0 
                    ? min(100, round(($totalSales / $nextRankMinSales) * 100, 2))
                    : 0,
                'commission_improvement' => self::getRankCommissionRate($currentRank) - self::getRankCommissionRate($nextRank)
            ];
        }

        // Prochains jalons importants
        $milestoneRanks = ['debutant', 'marchand', 'negociant', 'courtier', 'magnat', 'senior'];
        $currentIndex = array_search($currentRank, $milestoneRanks);
        
        if ($currentIndex !== false) {
            for ($i = $currentIndex + 1; $i < count($milestoneRanks); $i++) {
                $milestoneRank = $milestoneRanks[$i];
                $minSales = self::getRankMinSales($milestoneRank);
                
                $report['next_milestones'][] = [
                    'rank' => $milestoneRank,
                    'sales_required' => $minSales,
                    'sales_needed' => max(0, $minSales - $totalSales),
                    'commission_rate' => self::getRankCommissionRate($milestoneRank)
                ];
            }
        }

        return $report;
    }
}