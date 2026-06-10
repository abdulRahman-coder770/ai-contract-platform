<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    protected $fillable = ['title', 'description', 'body', 'status', 'user_id', 'analysis'];

   
    protected $casts = [
        'analysis' => 'array', 
    ];
}
