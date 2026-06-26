<?php

namespace App\Services;

use Gemini\Laravel\Facades\Gemini;

class GeminiService
{
    public function chat(string $message, string $context): string
    {
        $systemPrompt = "You are an expert AI contract assistant. Answer based ONLY on this text:\n\n" . $context;

        $response = Gemini::generativeModel('models/gemini-2.5-flash-lite')
            ->generateContent($systemPrompt . "\n\nUser Question: " . $message);

        return $response->text() ?? 'No response generated.';
    }
}