<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Events\ContractAnalyzedEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Gemini\Laravel\Facades\Gemini;

class AnalyzeContractJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;


    public $deleteWhenMissingModels = true;


    public function __construct(protected Contract $contract) {}

  
public function handle(): void
{
    
    $contract = $this->contract;

    try {
        Log::info('Job started for contract ID: ' . $contract->id);

        $result = Gemini::generativeModel('models/gemini-2.5-flash-lite')
            ->generateContent([
                "You are a legal AI compliance officer. Analyze this contract. " .
                "Respond ONLY with a JSON object. " .
                "Structure: {\"risk_score\": 0, \"key_findings\": [\"\"], \"verdict\": \"\"}. " .
                "Contract Text: " . $contract->body
            ]);

        $rawText = $result->text();
        $cleanJson = preg_replace('/^.*?\{/s', '{', $rawText);
        $cleanJson = preg_replace('/\}.*$/s', '}', $cleanJson);
        
        $aiData = json_decode($cleanJson, true);

        if (!$aiData) throw new \Exception("Invalid JSON response");

        
        $contract->update(['status' => 'review', 'analysis' => $aiData]);

    } catch (\Exception $e) {
        Log::error('Gemini API Error: ' . $e->getMessage());
        $contract->update(['status' => 'failed', 'analysis' => ['error' => 'AI unavailable']]);
    }

    
    event(new \App\Events\ContractAnalyzedEvent($contract));
    }
public function failed(\Throwable $exception): void
    {
       
        $this->contract->update(['status' => 'failed']);
    }
}