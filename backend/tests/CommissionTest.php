<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Utils\Commission;
use Tradefy\Config\Settings;

class CommissionTest extends TestCase
{
    protected function setUp(): void
    {
        // Initialiser les settings pour les tests
        $_ENV['JWT_SECRET'] = 'test-secret';
        $_ENV['APP_URL'] = 'http://localhost:3000';
        Settings::initialize();
    }

    public function testCalculateSaleCommission()
    {
        $result = Commission::calculateSaleCommission(10, 100.0);
        
        $this->assertEquals('profane', $result['rank']);
        $this->assertEquals(450, $result['commission_rate']);
        $this->assertEquals(4.5, $result['commission_amount']);
        $this->assertEquals(95.5, $result['vendor_amount']);
    }

    public function testQuestBonusCalculation()
    {
        // Test quête complétée (25 ventes = débutant, quête profane terminée)
        $bonus = Commission::calculateQuestBonus('profane', 30, 100.0);
        $this->assertEquals(5.0, $bonus); // 100 * 500 / 10000

        // Test quête non complétée
        $bonus = Commission::calculateQuestBonus('profane', 20, 100.0);
        $this->assertEquals(0.0, $bonus);
    }

    public function testRankProgression()
    {
        $this->assertTrue(Commission::canRankUp('profane', 25));
        $this->assertFalse(Commission::canRankUp('profane', 20));
        $this->assertFalse(Commission::canRankUp('senior', 3000));
    }

    public function testVendorStatsCalculation()
    {
        $stats = Commission::calculateVendorStats(50, 5000.0);
        
        $this->assertEquals('debutant', $stats['current_rank']);
        $this->assertEquals(50, $stats['total_sales']);
        $this->assertEquals(5000.0, $stats['total_revenue']);
        $this->assertArrayHasKey('rank_progression', $stats);
    }

    public function testPriceValidation()
    {
        $result = Commission::validateProductPrice(50.0);
        $this->assertTrue($result['valid']);

        $result = Commission::validateProductPrice(0.5);
        $this->assertFalse($result['valid']);
    }

    public function testEarningsSimulation()
    {
        $simulation = Commission::simulateEarnings(0, 100.0, 5);
        
        $this->assertCount(5, $simulation['simulation_details']);
        $this->assertArrayHasKey('summary', $simulation);
        $this->assertEquals(500.0, $simulation['summary']['total_projected_revenue']);
    }

    public function testPerformanceReport()
    {
        $report = Commission::generatePerformanceReport(100, 10000.0);
        
        $this->assertEquals('marchand', $report['current_rank']);
        $this->assertEquals(100, $report['total_sales']);
        $this->assertArrayHasKey('quest_status', $report);
        $this->assertArrayHasKey('next_milestones', $report);
    }

    public function testAllRanksData()
    {
        $ranks = Commission::getAllRanks();
        
        $this->assertArrayHasKey('profane', $ranks);
        $this->assertArrayHasKey('senior', $ranks);
        $this->assertEquals(450, $ranks['profane']['commission']);
        $this->assertEquals(300, $ranks['senior']['commission']);
    }
}