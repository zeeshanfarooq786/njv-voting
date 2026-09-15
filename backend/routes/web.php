<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    $spa = public_path('index.html');
    if (is_file($spa)) {
        return response()->file($spa);
    }

    return view('welcome');
});

Route::get('/storage/{path}', function (string $path) {
    $clean = str_replace('\\', '/', $path);
    abort_if(str_contains($clean, '..'), 404);
    abort_if(str_starts_with($clean, '/'), 404);

    $allowed = ['jpg', 'jpeg', 'png', 'webp'];
    $ext = strtolower(pathinfo($clean, PATHINFO_EXTENSION));
    abort_unless(in_array($ext, $allowed, true), 404);

    foreach ([
        public_path('uploads/'.$clean),
        public_path('uploads/candidates/'.basename($clean)),
        storage_path('app/public/'.$clean),
        storage_path('app/public/candidates/'.basename($clean)),
    ] as $file) {
        if (!is_file($file)) {
            continue;
        }

        $info = @getimagesize($file);
        abort_if($info === false, 404);

        return response()->file($file, [
            'Content-Type' => $info['mime'],
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline',
        ]);
    }

    abort(404);
})->where('path', '.*');
