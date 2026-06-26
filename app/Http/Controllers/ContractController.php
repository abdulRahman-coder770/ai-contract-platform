<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Jobs\AnalyzeContractJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Smalot\PdfParser\Parser;
use Gemini\Laravel\Facades\Gemini;
use App\Services\GeminiService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ContractController extends Controller
{
    use AuthorizesRequests;
   
    public function index()
    {
        return Inertia::render('Dashboard', [
            'contracts' => auth()->user()->contracts()->latest()->get() ?? []
        ]);
    }
    public function indexJson(Request $request)
    {
     
        $contracts = $request->user()->contracts()->latest()->get();
        
        return response()->json($contracts);
    }

  
    public function store(Request $request)
    {
       
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'body' => 'nullable|string',
            'contract_file' => 'nullable|file|mimes:pdf|max:10240',
        ]);

        $contractText = $validated['body'] ?? '';

       
        if ($request->hasFile('contract_file')) {
            try {
                $file = $request->file('contract_file');
                $parser = new Parser();
                $pdf = $parser->parseFile($file->getPathname());
                $contractText = $pdf->getText();
                
                if (empty(trim($contractText))) {
                    throw new \Exception("The PDF contains no readable text or is scanned.");
                }
            } catch (\Exception $e) {
                return redirect()->back()->withErrors([
                    'contract_file' => 'Failed to parse PDF: ' . $e->getMessage()
                ]);
            }
        }

       
        if (empty(trim($contractText))) {
            return redirect()->back()->withErrors([
                'body' => 'Please provide contract text or upload a valid text-based PDF.'
            ]);
        }

       
        $contract = $request->user()->contracts()->create([
            'title'       => $validated['title'],
            'description' => $validated['description'],
            'body'        => $contractText,
            'status'      => 'processing',
            'analysis'    => null,
        ]);

        AnalyzeContractJob::dispatch($contract);
            
     
        return to_route('dashboard')->with('new_contract', $contract);
    }

    public function destroy(Contract $contract)
{
 if ($contract->user_id === auth()->id()) {
        $contract->delete();
        return response()->json(['message' => 'Deleted']);
    }
    return response()->json(['message' => 'Unauthorized'], 403);
}


    public function chat(Request $request, Contract $contract)
    {

        
        if ($contract->user_id !== auth()->id()) {
            abort(403);
        }

       
        $request->validate(['message' => 'required|string']);
    
       
        try {
            $geminiService = new GeminiService();
            $answer = $geminiService->chat($request->message, $contract->body);
            
            return response()->json(['reply' => $answer]);
        } catch (\Exception $e) {
            \Log::error('Gemini Chat Error: ' . $e->getMessage());
            return response()->json(['reply' => 'Error: ' . $e->getMessage()], 500);
        }
    
 
    }
}