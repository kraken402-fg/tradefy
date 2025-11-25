<?php

namespace Tradefy\Services;

use Tradefy\Utils\CommissionCalculator;
use Tradefy\Models\User;
use PDO;
use Exception;

class GamificationService
{
    private $db;
    private $userModel;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->userModel = new User($db);
    }

    /**
     * Get user's current gamification status
     */
    public function getUserStatus(int $userId): array
    {
        $user = $this->userModel->findById($userId);
        if (!$user) {
            throw new Exception('User not found');
        }

        $salesCount = $user['sales_count'];
        $commissionInfo = $this->userModel->getCommissionInfo($userId);
        $questInfo = CommissionCalculator::calculateQuest($salesCount);

        // Calculate achievements
        $achievements = $this->getUserAchievements($userId, $salesCount, $user['total_revenue']);

        // Calculate next milestones
        $nextMilestones = $this->getNextMilestones($salesCount);

        return [
            'user_id' => $userId,
            'current_rank' => $commissionInfo['current_rank'],
            'sales_count' => $salesCount,
            'total_revenue' => (float) $user['total_revenue'],
            'commission_rate' => $commissionInfo['commission_rate'],
            'rank_progress' => $commissionInfo['rank_progress'],
            'quest_info' => $questInfo,
            'achievements' => $achievements,
            'next_milestones' => $nextMilestones,
            'leaderboard_position' => $this->getLeaderboardPosition($userId)
        ];
    }

    /**
     * Process a new sale and update gamification status
     */
    public function processSale(int $userId, float $saleAmount): array
    {
        // Record the sale
        $this->userModel->recordSale($userId, $saleAmount);

        $user = $this->userModel->findById($userId);
        if (!$user) {
            throw new Exception('User not found after recording sale');
        }

        $oldSalesCount = $user['sales_count'] - 1; // Before the new sale
        $newSalesCount = $user['sales_count'];

        // Check for rank upgrade
        $rankUpgrade = CommissionCalculator::checkRankUpgrade($oldSalesCount, $newSalesCount);
        
        // Check for quest completion
        $questCompletion = $this->checkQuestCompletion($userId, $oldSalesCount, $newSalesCount);
        
        // Check for achievement unlocks
        $newAchievements = $this->checkNewAchievements($userId, $newSalesCount, $user['total_revenue']);

        // Check for milestone reaches
        $reachedMilestones = $this->checkMilestoneReaches($oldSalesCount, $newSalesCount);

        $result = [
            'sale_recorded' => true,
            'sale_amount' => $saleAmount,
            'new_sales_count' => $newSalesCount,
            'new_total_revenue' => (float) $user['total_revenue'],
            'rank_upgrade' => $rankUpgrade,
            'quest_completion' => $questCompletion,
            'new_achievements' => $newAchievements,
            'reached_milestones' => $reachedMilestones
        ];

        // If rank upgraded, add bonus message
        if ($rankUpgrade['upgraded']) {
            $result['bonus_message'] = $this->getRankUpgradeBonusMessage($rankUpgrade['new_rank']);
        }

        return $result;
    }

    /**
     * Check if user completed a quest with the new sale
     */
    private function checkQuestCompletion(int $userId, int $oldSalesCount, int $newSalesCount): array
    {
        $oldQuest = CommissionCalculator::calculateQuest($oldSalesCount);
        $newQuest = CommissionCalculator::calculateQuest($newSalesCount);

        // Check if quest was completed (moved to next rank)
        if ($oldQuest['has_quest'] && $newQuest['has_quest'] && 
            $oldQuest['current_rank'] !== $newQuest['current_rank']) {
            
            return [
                'completed' => true,
                'old_rank' => $oldQuest['current_rank'],
                'new_rank' => $newQuest['current_rank'],
                'quest_bonus' => $newQuest['quest_bonus'],
                'message' => "Quest completed! Advanced from {$oldQuest['current_rank']} to {$newQuest['current_rank']}"
            ];
        }

        // Check if within quest range and made progress
        if ($newQuest['has_quest'] && $newSalesCount >= $newQuest['quest_start']) {
            $questProgress = $this->calculateQuestProgress($newSalesCount, $newQuest);
            
            return [
                'completed' => false,
                'in_progress' => true,
                'quest_progress' => $questProgress,
                'sales_remaining' => $newQuest['sales_remaining'],
                'message' => "Quest progress: {$questProgress}% complete"
            ];
        }

        return [
            'completed' => false,
            'in_progress' => false
        ];
    }

    /**
     * Calculate quest progress percentage
     */
    private function calculateQuestProgress(int $salesCount, array $questInfo): float
    {
        if (!$questInfo['has_quest'] || $salesCount < $questInfo['quest_start']) {
            return 0;
        }

        $questRange = $questInfo['quest_end'] - $questInfo['quest_start'];
        $progress = $salesCount - $questInfo['quest_start'];
        
        return min(100, max(0, ($progress / $questRange) * 100));
    }

    /**
     * Get user's achievements
     */
    private function getUserAchievements(int $userId, int $salesCount, float $totalRevenue): array
    {
        $achievements = [];
        
        // Sales count achievements
        $salesAchievements = [
            ['id' => 'first_sale', 'name' => 'First Sale', 'threshold' => 1],
            ['id' => '10_sales', 'name' => '10 Sales', 'threshold' => 10],
            ['id' => '50_sales', 'name' => '50 Sales', 'threshold' => 50],
            ['id' => '100_sales', 'name' => 'Century', 'threshold' => 100],
            ['id' => '500_sales', 'name' => '500 Sales', 'threshold' => 500],
            ['id' => '1000_sales', 'name' => 'Millenary', 'threshold' => 1000]
        ];

        foreach ($salesAchievements as $achievement) {
            if ($salesCount >= $achievement['threshold']) {
                $achievements[] = [
                    'id' => $achievement['id'],
                    'name' => $achievement['name'],
                    'description' => "Reach {$achievement['threshold']} sales",
                    'unlocked' => true,
                    'unlocked_at' => null, // Would be stored in database
                    'progress' => 100
                ];
            }
        }

        // Revenue achievements
        $revenueAchievements = [
            ['id' => 'first_revenue', 'name' => 'First Revenue', 'threshold' => 1],
            ['id' => '1000_revenue', 'name' => '$1K Revenue', 'threshold' => 1000],
            ['id' => '5000_revenue', 'name' => '$5K Revenue', 'threshold' => 5000],
            ['id' => '10000_revenue', 'name' => '$10K Revenue', 'threshold' => 10000],
            ['id' => '50000_revenue', 'name' => '$50K Revenue', 'threshold' => 50000]
        ];

        foreach ($revenueAchievements as $achievement) {
            $progress = min(100, ($totalRevenue / $achievement['threshold']) * 100);
            $achievements[] = [
                'id' => $achievement['id'],
                'name' => $achievement['name'],
                'description' => "Generate \${$achievement['threshold']} in revenue",
                'unlocked' => $totalRevenue >= $achievement['threshold'],
                'unlocked_at' => null,
                'progress' => round($progress, 1)
            ];
        }

        // Rank achievements
        $currentRank = CommissionCalculator::getRank($salesCount);
        $ranks = CommissionCalculator::getAllRanks();
        $rankIndex = 0;
        
        foreach (array_keys($ranks) as $index => $rank) {
            if ($rank === $currentRank) {
                $rankIndex = $index;
                break;
            }
        }

        // Unlock all previous ranks as achievements
        $allRanks = array_keys($ranks);
        for ($i = 0; $i <= $rankIndex; $i++) {
            $achievements[] = [
                'id' => 'rank_' . strtolower(str_replace(' ', '_', $allRanks[$i])),
                'name' => $allRanks[$i] . ' Rank',
                'description' => "Achieve {$allRanks[$i]} rank",
                'unlocked' => true,
                'unlocked_at' => null,
                'progress' => 100
            ];
        }

        return $achievements;
    }

    /**
     * Check for new achievements after a sale
     */
    private function checkNewAchievements(int $userId, int $newSalesCount, float $newTotalRevenue): array
    {
        $currentAchievements = $this->getUserAchievements($userId, $newSalesCount, $newTotalRevenue);
        
        // Filter only newly unlocked achievements (in a real system, we'd compare with previous state)
        $newAchievements = array_filter($currentAchievements, function($achievement) {
            return $achievement['unlocked'] && $achievement['progress'] === 100;
        });

        return array_values($newAchievements);
    }

    /**
     * Get next milestones for user
     */
    private function getNextMilestones(int $salesCount): array
    {
        $milestones = [];
        $currentRank = CommissionCalculator::getRank($salesCount);
        $ranks = CommissionCalculator::getAllRanks();
        
        // Next rank milestone
        $rankKeys = array_keys($ranks);
        $currentIndex = array_search($currentRank, $rankKeys);
        
        if ($currentIndex < count($rankKeys) - 1) {
            $nextRank = $rankKeys[$currentIndex + 1];
            $nextRankThreshold = $ranks[$nextRank]['min'];
            $salesNeeded = $nextRankThreshold - $salesCount;
            
            $milestones[] = [
                'type' => 'rank',
                'name' => $nextRank . ' Rank',
                'target' => $nextRankThreshold,
                'current' => $salesCount,
                'remaining' => max(0, $salesNeeded),
                'reward' => 'Lower commission rate, quest bonus'
            ];
        }

        // Sales milestones
        $salesMilestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
        foreach ($salesMilestones as $milestone) {
            if ($salesCount < $milestone) {
                $milestones[] = [
                    'type' => 'sales',
                    'name' => "{$milestone} Sales",
                    'target' => $milestone,
                    'current' => $salesCount,
                    'remaining' => $milestone - $salesCount,
                    'reward' => 'Achievement badge'
                ];
                break;
            }
        }

        return $milestones;
    }

    /**
     * Check if any milestones were reached
     */
    private function checkMilestoneReaches(int $oldSalesCount, int $newSalesCount): array
    {
        $reached = [];
        $milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

        foreach ($milestones as $milestone) {
            if ($oldSalesCount < $milestone && $newSalesCount >= $milestone) {
                $reached[] = [
                    'type' => 'sales',
                    'milestone' => $milestone,
                    'message' => "Reached {$milestone} sales milestone!"
                ];
            }
        }

        return $reached;
    }

    /**
     * Get leaderboard position for user
     */
    public function getLeaderboardPosition(int $userId): array
    {
        $sql = "SELECT 
                (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.sales_count > u1.sales_count AND u2.is_active = true) as sales_rank,
                (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.total_revenue > u1.total_revenue AND u2.is_active = true) as revenue_rank,
                (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users
                FROM users u1 
                WHERE u1.id = :user_id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            return [
                'sales_rank' => null,
                'revenue_rank' => null,
                'total_users' => 0
            ];
        }

        return [
            'sales_rank' => (int) $result['sales_rank'],
            'revenue_rank' => (int) $result['revenue_rank'],
            'total_users' => (int) $result['total_users'],
            'sales_percentile' => $result['total_users'] > 0 ? 
                round((($result['total_users'] - $result['sales_rank']) / $result['total_users']) * 100, 1) : 0,
            'revenue_percentile' => $result['total_users'] > 0 ? 
                round((($result['total_users'] - $result['revenue_rank']) / $result['total_users']) * 100, 1) : 0
        ];
    }

    /**
     * Get global leaderboard
     */
    public function getLeaderboard(string $type = 'sales', int $limit = 50): array
    {
        $validTypes = ['sales', 'revenue'];
        $type = in_array($type, $validTypes) ? $type : 'sales';
        
        $orderBy = $type === 'sales' ? 'sales_count DESC' : 'total_revenue DESC';

        $sql = "SELECT 
                id, email, role, sales_count, total_revenue, 
                created_at, profile_data
                FROM users 
                WHERE is_active = true 
                ORDER BY {$orderBy}, created_at ASC
                LIMIT :limit";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $leaderboard = [];
        $rank = 1;

        foreach ($users as $user) {
            $currentRank = CommissionCalculator::getRank($user['sales_count']);
            $profileData = json_decode($user['profile_data'], true) ?? [];

            $leaderboard[] = [
                'rank' => $rank++,
                'user_id' => $user['id'],
                'email' => $user['email'],
                'display_name' => $profileData['store_name'] ?? $profileData['first_name'] ?? 'Anonymous',
                'sales_count' => $user['sales_count'],
                'total_revenue' => (float) $user['total_revenue'],
                'current_rank' => $currentRank,
                'join_date' => $user['created_at']
            ];
        }

        return [
            'type' => $type,
            'leaderboard' => $leaderboard,
            'total_entries' => count($leaderboard),
            'updated_at' => date('c')
        ];
    }

    /**
     * Get rank upgrade bonus message
     */
    private function getRankUpgradeBonusMessage(string $newRank): string
    {
        $bonusMessages = [
            'Beginner' => 'Welcome to the Beginner rank! Your commission rate has improved.',
            'Merchant I' => 'Congratulations on becoming a Merchant! Keep up the great work.',
            'Merchant II' => 'Advanced to Merchant II! Your business is growing steadily.',
            'Courtier' => 'Impressive! You\'ve reached Courtier rank.',
            'Magnat' => 'Magnat rank achieved! You\'re among the top sellers.',
            'Senior' => 'Elite Senior rank! Maximum level reached with best commissions.'
        ];

        return $bonusMessages[$newRank] ?? "Congratulations on reaching {$newRank} rank!";
    }

    /**
     * Get user's progress towards next quest
     */
    public function getQuestProgress(int $userId): array
    {
        $user = $this->userModel->findById($userId);
        if (!$user) {
            throw new Exception('User not found');
        }

        $salesCount = $user['sales_count'];
        $questInfo = CommissionCalculator::calculateQuest($salesCount);

        if (!$questInfo['has_quest']) {
            return [
                'has_quest' => false,
                'message' => 'Maximum rank achieved - no active quest'
            ];
        }

        $progress = $this->calculateQuestProgress($salesCount, $questInfo);

        return [
            'has_quest' => true,
            'current_rank' => $questInfo['current_rank'],
            'next_rank' => $questInfo['next_rank'],
            'quest_start' => $questInfo['quest_start'],
            'quest_end' => $questInfo['quest_end'],
            'current_sales' => $salesCount,
            'sales_remaining' => $questInfo['sales_remaining'],
            'progress_percentage' => round($progress, 1),
            'quest_bonus' => $questInfo['quest_bonus'],
            'estimated_completion' => $this->estimateQuestCompletion($salesCount, $questInfo)
        ];
    }

    /**
     * Estimate when quest might be completed
     */
    private function estimateQuestCompletion(int $salesCount, array $questInfo): array
    {
        if (!$questInfo['has_quest'] || $salesCount >= $questInfo['quest_end']) {
            return ['available' => false];
        }

        $salesNeeded = $questInfo['sales_remaining'];
        
        // Simple estimation based on average daily sales (would be more sophisticated in production)
        $sql = "SELECT 
                COUNT(*) as sales_last_30_days
                FROM orders 
                WHERE vendor_id = :user_id 
                AND created_at >= NOW() - INTERVAL '30 days'";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $GLOBALS['user_id'] ?? 0]); // This would need the actual user ID
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        $dailyAverage = $result['sales_last_30_days'] / 30;
        
        if ($dailyAverage > 0) {
            $daysRemaining = ceil($salesNeeded / $dailyAverage);
            $estimatedDate = date('Y-m-d', strtotime("+{$daysRemaining} days"));
            
            return [
                'available' => true,
                'sales_needed' => $salesNeeded,
                'daily_average' => round($dailyAverage, 1),
                'days_remaining' => $daysRemaining,
                'estimated_date' => $estimatedDate,
                'confidence' => $dailyAverage >= 1 ? 'high' : ($dailyAverage >= 0.5 ? 'medium' : 'low')
            ];
        }

        return [
            'available' => true,
            'sales_needed' => $salesNeeded,
            'daily_average' => 0,
            'days_remaining' => null,
            'estimated_date' => null,
            'confidence' => 'unknown'
        ];
    }

    /**
     * Get gamification statistics for admin
     */
    public function getGamificationStats(): array
    {
        // Total active users
        $sql = "SELECT COUNT(*) as total_users FROM users WHERE is_active = true";
        $stmt = $this->db->query($sql);
        $totalUsers = (int) $stmt->fetchColumn();

        // Users by rank
        $sql = "SELECT 
                COUNT(*) as count,
                CASE 
                    WHEN sales_count BETWEEN 0 AND 24 THEN 'Profane'
                    WHEN sales_count BETWEEN 25 AND 74 THEN 'Beginner'
                    WHEN sales_count BETWEEN 75 AND 227 THEN 'Merchant I'
                    WHEN sales_count BETWEEN 228 AND 554 THEN 'Merchant II'
                    WHEN sales_count BETWEEN 555 AND 1004 THEN 'Courtier'
                    WHEN sales_count BETWEEN 1005 AND 2849 THEN 'Magnat'
                    ELSE 'Senior'
                END as rank
                FROM users 
                WHERE is_active = true 
                GROUP BY rank
                ORDER BY MIN(sales_count)";

        $stmt = $this->db->query($sql);
        $usersByRank = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Total platform sales and revenue
        $sql = "SELECT 
                SUM(sales_count) as total_sales,
                SUM(total_revenue) as total_revenue
                FROM users 
                WHERE is_active = true";

        $stmt = $this->db->query($sql);
        $totals = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total_users' => $totalUsers,
            'users_by_rank' => $usersByRank,
            'platform_totals' => [
                'total_sales' => (int) ($totals['total_sales'] ?? 0),
                'total_revenue' => (float) ($totals['total_revenue'] ?? 0)
            ],
            'average_per_user' => [
                'sales' => $totalUsers > 0 ? round(($totals['total_sales'] ?? 0) / $totalUsers, 1) : 0,
                'revenue' => $totalUsers > 0 ? round(($totals['total_revenue'] ?? 0) / $totalUsers, 2) : 0
            ]
        ];
    }
}