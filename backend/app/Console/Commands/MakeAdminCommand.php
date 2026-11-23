<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Console\Command;

class MakeAdminCommand extends Command
{
    protected $signature = 'ordarat:make-admin {identifier : The email or firebase_uid of the user}';

    protected $description = 'Promote an existing user to platform admin (server-side only)';

    public function handle(): int
    {
        $identifier = $this->argument('identifier');

        $user = User::where('email', $identifier)
            ->orWhere('firebase_uid', $identifier)
            ->first();

        if (! $user) {
            $this->error("المستخدم صاحب المعرف [{$identifier}] غير موجود في قاعدة البيانات.");
            return Command::FAILURE;
        }

        $oldRole = $user->role;
        $user->update(['role' => 'admin']);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'SERVER_PROMOTE_TO_ADMIN',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'old_values' => ['role' => $oldRole],
            'new_values' => ['role' => 'admin', 'promoted_via' => 'cli_artisan_command'],
            'ip_address' => '127.0.0.1',
        ]);

        $this->info("تمت ترقية [{$user->name}] ({$user->email}) إلى مدير منصة (admin) بنجاح.");
        return Command::SUCCESS;
    }
}
