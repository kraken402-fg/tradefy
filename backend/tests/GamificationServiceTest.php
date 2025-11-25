<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Services\GamificationService;
use Tradefy\Models\User;
use PDO;

class GamificationServiceTest extends TestCase
{
    private $db;
    private $gamificationService;
    private $userModel;

    protected function setUp(): void
    {
        // Create in-memory SQLite database for testing
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Create users table
        $this->createUsersTable();

        $this->gamificationService = new GamificationService($this->db);
        $this->userModel = new User($this->db);
    }

    private function createUsersTable(): void
    {
        $sql = "
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                vendor_id INTEGER,
                sales_count INTEGER DEFAULT 0,
                total_revenue DECIMAL(10,2) DEFAULT 0.00,
                profile_data TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        ";

        $this->db->exec($sql);
    }

    private function createTestUser(string $email, int $salesCount = 0, float $totalRevenue = 0): array
    {
        $userData = [
            'email' => $email,
            'password' => 'SecurePass123!',
            'sales_count' => $salesCount,
            'total_revenue' => $totalRevenue
        ];

        // We need to manually insert since User model doesn't allow setting sales_count directly
        $sql = "INSERT INTO users (email, password_hash, sales_count, total_revenue) 
                VALUES (:email, :password_hash, :sales_count, :total_revenue)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':email' => $email,
            ':password_hash' => password_hash('SecurePass123!', PASSWORD_BCRYPT),
            ':sales_count' => $salesCount,
            ':total_revenue' => $totalRevenue
        ]);

        $userId = $this->db->lastInsertId();
        return $this->userModel->findById($userId);
    }

    public function testGetUserStatus()
    {
        $user = $this->createTestUser('status@tradefy.com', 10, 500.00);
        
        $status = $this->gamificationService->getUserStatus($user['id']);

        $this->assertEquals($user['id'], $status['user_id']);
        $this->assertEquals(10, $status['sales_count']);
        $this->assertEquals(500.00, $status['total_revenue']);
        $this->assertArrayHasKey('current_rank', $status);
        $this->assertArrayHasKey('commission_rate', $status);
        $this->assertArrayHasKey('rank_progress', $status);
        $this->assertArrayHasKey('quest_info', $status);
        $this->assertArrayHasKey('achievements', $status);
        $this->assertArrayHasKey('next_milestones', $status);
        $this->assertArrayHasKey('leaderboard_position', $status);
    }

    public function testProcessSale()
    {
        $user = $this->createTestUser('sale@tradefy.com', 5, 100.00);
        
        $result = $this->gamificationService->processSale($user['id'], 50.00);

        $this->assertTrue($result['sale_recorded']);
        $this->assertEquals(50.00, $result['sale_amount']);
        $this->assertEquals(6, $result['new_sales_count']);
        $this->assertEquals(150.00, $result['new_total_revenue']);
        $this->assertArrayHasKey('rank_upgrade', $result);
        $this->assertArrayHasKey('quest_completion', $result);
        $this->assertArrayHasKey('new_achievements', $result);
        $this->assertArrayHasKey('reached_milestones', $result);
    }

    public function testProcessSaleWithRankUpgrade()
    {
        $user = $this->createTestUser('upgrade@tradefy.com', 24, 240.00); // At Profane max
        
        $result = $this->gamificationService->processSale($user['id'], 10.00);

        $this->assertTrue($result['rank_upgrade']['upgraded']);
        $this->assertEquals('Profane', $result['rank_upgrade']['old_rank']);
        $this->assertEquals('Beginner', $result['rank_upgrade']['new_rank']);
        $this->assertArrayHasKey('bonus_message', $result);
    }

    public function testGetLeaderboard()
    {
        // Create multiple test users with different sales counts
        $this->createTestUser('user1@tradefy.com', 100, 1000.00);
        $this->createTestUser('user2@tradefy.com', 50, 500.00);
        $this->createTestUser('user3@tradefy.com', 200, 2000.00);

        $salesLeaderboard = $this->gamificationService->getLeaderboard('sales', 10);
        
        $this->assertEquals('sales', $salesLeaderboard['type']);
        $this->assertCount(3, $salesLeaderboard['leaderboard']);
        $this->assertEquals(3, $salesLeaderboard['total_entries']);
        
        // Check ranking order (should be by sales count descending)
        $this->assertEquals(200, $salesLeaderboard['leaderboard'][0]['sales_count']);
        $this->assertEquals(100, $salesLeaderboard['leaderboard'][1]['sales_count']);
        $this->assertEquals(50, $salesLeaderboard['leaderboard'][2]['sales_count']);

        $revenueLeaderboard = $this->gamificationService->getLeaderboard('revenue', 10);
        $this->assertEquals('revenue', $revenueLeaderboard['type']);
    }

    public function testGetLeaderboardPosition()
    {
        $user1 = $this->createTestUser('leader1@tradefy.com', 100, 1000.00);
        $user2 = $this->createTestUser('leader2@tradefy.com', 50, 500.00);
        
        $position = $this->gamificationService->getLeaderboardPosition($user1['id']);

        $this->assertArrayHasKey('sales_rank', $position);
        $this->assertArrayHasKey('revenue_rank', $position);
        $this->assertArrayHasKey('total_users', $position);
        $this->assertArrayHasKey('sales_percentile', $position);
        $this->assertArrayHasKey('revenue_percentile', $position);
        $this->assertEquals(2, $position['total_users']); // 2 users total
    }

    public function testGetQuestProgress()
    {
        $user = $this->createTestUser('quest@tradefy.com', 20, 200.00);
        
        $progress = $this->gamificationService->getQuestProgress($user['id']);

        $this->assertArrayHasKey('has_quest', $progress);
        $this->assertArrayHasKey('current_rank', $progress);
        $this->assertArrayHasKey('next_rank', $progress);
        $this->assertArrayHasKey('progress_percentage', $progress);
        $this->assertArrayHasKey('sales_remaining', $progress);
        
        if ($progress['has_quest']) {
            $this->assertArrayHasKey('quest_start', $progress);
            $this->assertArrayHasKey('quest_end', $progress);
            $this->assertArrayHasKey('quest_bonus', $progress);
            $this->assertArrayHasKey('estimated_completion', $progress);
        }
    }

    public function testGetGamificationStats()
    {
        // Create test users with different ranks
        $this->createTestUser('stat1@tradefy.com', 10, 100.00);  // Profane
        $this->createTestUser('stat2@tradefy.com', 30, 300.00);  // Beginner
        $this->createTestUser('stat3@tradefy.com', 100, 1000.00); // Merchant I

        $stats = $this->gamificationService->getGamificationStats();

        $this->assertArrayHasKey('total_users', $stats);
        $this->assertArrayHasKey('users_by_rank', $stats);
        $this->assertArrayHasKey('platform_totals', $stats);
        $this->assertArrayHasKey('average_per_user', $stats);

        $this->assertEquals(3, $stats['total_users']);
        $this->assertGreaterThan(0, count($stats['users_by_rank']));
        
        $platformTotals = $stats['platform_totals'];
        $this->assertEquals(140, $platformTotals['total_sales']); // 10 + 30 + 100
        $this->assertEquals(1400.00, $platformTotals['total_revenue']); // 100 + 300 + 1000
    }

    public function testAchievementSystem()
    {
        $user = $this->createTestUser('achievement@tradefy.com', 15, 1500.00);
        
        $status = $this->gamificationService->getUserStatus($user['id']);
        $achievements = $status['achievements'];

        $this->assertIsArray($achievements);
        
        // Should have first_sale achievement
        $firstSaleAchievement = array_filter($achievements, function($a) {
            return $a['id'] === 'first_sale';
        });
        $this->assertCount(1, array_values($firstSaleAchievement));

        // Should have 10_sales achievement
        $tenSalesAchievement = array_filter($achievements, function($a) {
            return $a['id'] === '10_sales';
        });
        $this->assertCount(1, array_values($tenSalesAchievement));

        // Should have revenue achievements with progress
        $revenueAchievements = array_filter($achievements, function($a) {
            return strpos($a['id'], 'revenue') !== false;
        });
        $this->assertGreaterThan(0, count($revenueAchievements));
    }

    public function testNextMilestones()
    {
        $user = $this->createTestUser('milestone@tradefy.com', 8, 80.00);
        
        $status = $this->gamificationService->getUserStatus($user['id']);
        $milestones = $status['next_milestones'];

        $this->assertIsArray($milestones);
        $this->assertGreaterThan(0, count($milestones));

        // Should have 10 sales milestone
        $salesMilestone = array_filter($milestones, function($m) {
            return $m['type'] === 'sales' && $m['target'] === 10;
        });
        $this->assertCount(1, array_values($salesMilestone));

        // Should have rank milestone
        $rankMilestone = array_filter($milestones, function($m) {
            return $m['type'] === 'rank';
        });
        $this->assertCount(1, array_values($rankMilestone));
    }

    public function testUserNotFound()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('User not found');

        $this->gamificationService->getUserStatus(9999);
    }
}