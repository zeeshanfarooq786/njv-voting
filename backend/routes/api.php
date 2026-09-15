<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\VoteController;
use Illuminate\Support\Facades\Route;

Route::post('/teacher/login', [AuthController::class, 'teacherLogin'])->middleware('throttle:10,1');
Route::post('/admin/login', [AuthController::class, 'adminLogin'])->middleware('throttle:10,1');

Route::get('/candidates', [VoteController::class, 'candidates'])->middleware('throttle:60,1');
Route::get('/ballot', [VoteController::class, 'ballot'])->middleware(['auth:sanctum', 'throttle:120,1']);
Route::post('/vote', [VoteController::class, 'store'])->middleware('throttle:20,1');

Route::middleware(['auth:sanctum', 'role:teacher', 'throttle:120,1'])->group(function () {
    Route::get('/teacher/me', [AuthController::class, 'me']);
    Route::post('/teacher/logout', [AuthController::class, 'logout']);
    Route::post('/session/start', [SessionController::class, 'start'])->middleware('throttle:30,1');
    Route::post('/session/end', [SessionController::class, 'end']);
});

Route::middleware(['auth:sanctum', 'role:admin', 'throttle:240,1'])->group(function () {
    Route::get('/admin/me', [AuthController::class, 'me']);
    Route::post('/admin/logout', [AuthController::class, 'logout']);
    Route::get('/admin/results', [AdminController::class, 'results']);
    Route::get('/admin/votes', [AdminController::class, 'votes']);
    Route::get('/admin/events', [AdminController::class, 'events']);
    Route::post('/admin/candidates', [AdminController::class, 'storeCandidate']);
    Route::post('/admin/candidates/{candidate}', [AdminController::class, 'updateCandidate']);
    Route::put('/admin/candidates/{candidate}', [AdminController::class, 'updateCandidate']);
    Route::delete('/admin/candidates/{candidate}', [AdminController::class, 'destroyCandidate']);
    Route::post('/admin/voting/toggle', [AdminController::class, 'toggleVoting']);
    Route::get('/admin/settings', [AdminController::class, 'settings']);
    Route::post('/admin/settings', [AdminController::class, 'updateSettings']);
    Route::put('/admin/settings', [AdminController::class, 'updateSettings']);
    Route::get('/admin/teachers', [AdminController::class, 'teachers']);
    Route::post('/admin/teachers', [AdminController::class, 'storeTeacher']);
    Route::put('/admin/teachers/{user}', [AdminController::class, 'updateTeacher']);
    Route::delete('/admin/teachers/{user}', [AdminController::class, 'destroyTeacher']);
    Route::post('/admin/teachers/{user}/password', [AdminController::class, 'updateTeacherPassword']);
});
