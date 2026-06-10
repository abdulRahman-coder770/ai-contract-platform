<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ContractController extends Controller
{
    /**
     * Render the dashboard with the current user's contracts.
     */
    public function index()
    {
        return Inertia::render('Dashboard', [
            'contracts' => auth()->user()->contracts()->latest()->get() ?? []
        ]);
    }

    /**
     * Validate, analyze with Ollama AI, and store the contract.
     */
    public function store(Request $request)
    {
        // 1. Validate inputs defensively
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'body' => 'required|string',
        ]);

        $aiData = null;
        $errorMessage = null;

        // 2. Define the exact system prompt instructing the AI to output JSON only
        $systemPrompt = "You are a legal AI compliance officer. Analyze the provided contract text. "
            . "You MUST respond with a valid, raw JSON object ONLY. Do not wrap the JSON in markdown code blocks "
            . "(do not use ```json or ```). No conversational preamble or postscript. "
            . "The JSON structure must exactly match this template:\n"
            . "{\n"
            . "  \"risk_score\": 75,\n"
            . "  \"key_findings\": [\"Finding 1\", \"Finding 2\"],\n"
            . "  \"verdict\": \"Summary sentence.\"\n"
            . "}";

        try {
            // Send request to Ollama with a 90 second timeout
            $response = Http::timeout(90)
                ->withoutVerifying()
                ->post('http://host.docker.internal:11434/api/generate', [
                    'model'  => 'llama3.2', 
                    'prompt' => $systemPrompt . "\n\nContract Text:\n" . $validated['body'],
                    'stream' => false,
                    'format' => 'json' // Instructs Ollama's engine to force JSON mode
                ]);

            if ($response->failed()) {
                throw new \Exception("Ollama API connection failed with status: " . $response->status());
            }

            $responseBody = $response->json();
            
            if (!isset($responseBody['response'])) {
                throw new \Exception("Ollama returned an unexpected empty payload envelope.");
            }

            // Extract and clean raw text response from Ollama
            $rawAiText = $responseBody['response'];
            $cleanJson = trim(preg_replace('/^
                ```(?:json)?|```$/im', '', $rawAiText));
            // Parse response string into PHP array
            $aiData = json_decode($cleanJson, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception("Failed to parse Ollama output as JSON. Raw response was: " . $rawAiText);
            }

        } catch (\Exception $e) {
            // Log the complete error trace in storage/logs/laravel.log
            Log::error('Ollama AI Processing Error: ' . $e->getMessage());
            $errorMessage = $e->getMessage();

            // Store diagnostics in the contract record so the user can debug directly on the UI
            $aiData = [
                'risk_score'   => 0,
                'key_findings' => [
                    'Error: ' . $errorMessage,
                    'Diagnostic Check: Ensure Ollama is running on your host machine.',
                    'Network Check: If you are using Windows WSL2, check your firewall policies.',
                ],
                'verdict'      => 'Connection to local AI engine timed out or was rejected.'
            ];
        }

        // 3. Save the record linked to the authenticated user
        $request->user()->contracts()->create([
            'title'       => $validated['title'],
            'description' => $validated['description'],
            'body'        => $validated['body'],
            'status'      => $errorMessage ? 'failed' : 'review',
            'analysis'    => $aiData,
        ]);

        return redirect()->route('dashboard');
    }
}