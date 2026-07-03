import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { Avatar } from '@/components/ui/Avatar';
import type { Profile } from '@/lib/types';

/** Kenar çubuğu altındaki kullanıcı kartı + çıkış (server component). */
export function UserFooter({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={profile.full_name} size="sm" className="bg-brand-700" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">
          {profile.full_name}
        </p>
        <p className="truncate text-[11px] text-brand-300">
          {profile.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Çıkış yap"
          title="Çıkış yap"
          className="rounded-lg p-2 text-brand-300 transition-colors hover:bg-brand-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
