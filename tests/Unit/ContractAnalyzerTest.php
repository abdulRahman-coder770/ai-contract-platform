<?php

namespace Tests\Unit;

use App\Services\ContractAnalyzer;
use PHPUnit\Framework\TestCase;

class ContractAnalyzerTest extends TestCase
{
    public function test_it_requests_fallback_for_low_confidence_scores()
    {
        $analyzer = new ContractAnalyzer();

        // High confidence (0.9) should NOT need fallback
        $this->assertFalse($analyzer->needsGeminiFallback(0.9));

        // Low confidence (0.5) SHOULD need fallback
        $this->assertTrue($analyzer->needsGeminiFallback(0.5));
    }
}