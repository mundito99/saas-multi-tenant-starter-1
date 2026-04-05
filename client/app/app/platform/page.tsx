'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { platformApi, type PlatformTenant } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function PlatformPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTenantId, setSavingTenantId] = useState<string | null>(null);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await platformApi.listTenants();
      setTenants(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleStatusChange = async (tenantId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      setSavingTenantId(tenantId);
      await platformApi.updateTenantStatus(tenantId, status);
      await loadTenants();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update tenant status');
    } finally {
      setSavingTenantId(null);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Control</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review tenants, owner emails, and platform status from one place.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tenants</CardTitle>
              <CardDescription>Minimal super admin foundation for platform operations</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {tenants.map((tenant) => (
                    <div key={tenant.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h2 className="font-semibold">{tenant.name}</h2>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                              {tenant.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Slug: {tenant.slug}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Owner: {tenant.ownerEmail ?? 'No owner found'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Members: {tenant.memberCount}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            disabled={savingTenantId === tenant.id || tenant.status === 'ACTIVE'}
                            onClick={() => handleStatusChange(tenant.id, 'ACTIVE')}
                          >
                            Activate
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={savingTenantId === tenant.id || tenant.status === 'SUSPENDED'}
                            onClick={() => handleStatusChange(tenant.id, 'SUSPENDED')}
                          >
                            Suspend
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tenants.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-500">No tenants found.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
