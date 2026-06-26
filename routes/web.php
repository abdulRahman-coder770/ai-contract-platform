<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ContractController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Gemini\Laravel\Facades\Gemini;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});
Route::get('/list-models', function () {
    $models = \Gemini\Laravel\Facades\Gemini::models()->list();
    return response()->json($models);
});

use Illuminate\Http\Client\RequestException;

Route::get('/test-gemini-connection', function () {
    try {
        $response = Gemini::generativeModel('models/gemini-2.5-flash-lite')
            ->generateContent('Hello');

        return response()->json([
            'status' => 'success',
            'response' => $response->text()
        ]);
    } catch (\Exception $e) {
    
        return response()->json([
            'status' => 'quota_exceeded',
            'message' => 'Please check your Google AI Studio billing status.'
        ], 429);
    }
});

Route::get('/contracts/json', [ContractController::class, 'indexJson'])->name('contracts.index-json');
Route::get('/dashboard', [ContractController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::post('/contracts/{contract}/chat', [ContractController::class, 'chat'])->name('contracts.chat');
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});
Route::post('/contracts', [ContractController::class, 'store'])
    ->middleware(['auth', 'verified'])
    ->name('contracts.store');
Route::delete('/contracts/{contract}', [ContractController::class, 'destroy'])
    ->middleware(['auth', 'verified'])
    ->name('contracts.destroy');

require __DIR__.'/auth.php';
