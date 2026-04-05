'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Building2,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [invitationCount, setInvitationCount] = useState(0);

  useEffect(() => {
    const loadInvitationCount = async () => {
      try {
        const invitations = await authApi.getInvitations();
        setInvitationCount(invitations.length);
      } catch (error) {
      }
    };

    if (user) {
      loadInvitationCount();
      const interval = setInterval(loadInvitationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
          <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">SaaS Starter</h1>
        </div>
        <nav className="p-4">
          <div className="space-y-1">
            <Link
              href="/app"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/app'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            <Link
              href="/app/branches"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/app/branches'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              <GitBranch className="h-4 w-4" />
              Branches
            </Link>

            <Link
              href="/app/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/app/settings'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            <Link
              href="/app/invitations"
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/app/invitations'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              <Mail className="h-4 w-4" />
              Invitations
              {invitationCount > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {invitationCount > 9 ? '9+' : invitationCount}
                </span>
              )}
            </Link>

            {user?.isPlatformAdmin && (
              <Link
                href="/app/platform"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/app/platform'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                )}
              >
                <Shield className="h-4 w-4" />
                Platform
              </Link>
            )}
          </div>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="h-4 w-4" />
                  <span>Tenant: {user.tenantName ?? ''}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-4 w-4" />
                  <span>User: {user.email ?? ''}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
