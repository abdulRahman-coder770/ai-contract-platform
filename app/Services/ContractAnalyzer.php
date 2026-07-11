<?php

namespace App\Services;

class ContractAnalyzer
{
    // If confidence is below 0.8, we trigger the Gemini fallback
    public function needsGeminiFallback(float $confidenceScore): bool
    {
        return $confidenceScore < 0.8;
    }
}