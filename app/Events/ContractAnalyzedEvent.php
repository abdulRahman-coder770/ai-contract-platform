<?php

namespace App\Events;

use App\Models\Contract;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContractAnalyzedEvent implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(public Contract $contract) {}

 public function broadcastOn()
    {
        return new PrivateChannel('user.' . $this->contract->user_id);
    }

    public function broadcastAs(): string
    {
      
        return 'ContractAnalyzedEvent';
    }

    public function broadcastWith(): array
    {
        return [
            'id'       => $this->contract->id,
            'title'    => $this->contract->title,
            'desc'     => $this->contract->description,
            'status'   => $this->contract->status,
            'analysis' => $this->contract->analysis,
        ];
    }
}