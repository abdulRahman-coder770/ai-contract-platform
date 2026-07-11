<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Jobs\AnalyzeContractJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContractAnalysisTest extends TestCase
{
    use RefreshDatabase;

    public function test_contract_status_updates_to_failed_on_job_failure()
    {
      
        $contract = Contract::factory()->create([
            'status' => 'processing'
        ]);

      
        $job = new AnalyzeContractJob($contract);
        $job->failed(new \Exception('API Connection Timeout'));

       
        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'status' => 'failed',
        ]);
    }
}