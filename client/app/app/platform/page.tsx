'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { platformApi, type PlatformTenant } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function PlatformPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingTenantId, setSavingTenantId] = useState<string | null>(null);

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const canAccess = !!user?.isPlatformAdmin;

  const suggestedSlug = useMemo(
    () =>
      tenantName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    [tenantName],
  );

  useEffect(() => {
    if (!tenantSlug && suggestedSlug) {
      setTenantSlug(suggestedSlug);
    }
  }, [suggestedSlug, tenantSlug]);

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
    if (canAccess) {
      loadTenants();
    } else {
      setLoading(false);
    }
  }, [canAccess]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setCreating(true);
      await platformApi.createTenant({
        tenantName,
        tenantSlug,
        adminEmail,
      });

      setTenantName('');
      setTenantSlug('');
      setAdminEmail('');
      await loadTenants();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

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
              Platform now stays focused on tenant lifecycle management. Branches belong to tenant scope.
            </p>
          </div>

          {!canAccess ? (
            <Card>
              <CardHeader>
                <CardTitle>Access denied</CardTitle>
                <CardDescription>Only platform admins can access this page.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {error}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Create tenant</CardTitle>
                  <CardDescription>
                    Creates the tenant and assigns the initial tenant admin. Branch creation happens later inside the tenant.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTenant} className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="tenantName">Tenant name</Label>
                      <Input
                        id="tenantName"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="Acme Inc."
                        required
                        disabled={creating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tenantSlug">Tenant slug</Label>
                      <Input
                        id="tenantSlug"
                        value={tenantSlug}
                        onChange={(e) => setTenantSlug(e.target.value)}
                        placeholder="acme-inc"
                        required
                        disabled={creating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Initial admin email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="owner@acme.com"
                        required
                        disabled={creating}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <Button type="submit" disabled={creating}>
                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create tenant
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tenants</CardTitle>
                  <CardDescription>Tenant-level management only</CardDescription>
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
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    tenant.status === 'ACTIVE'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
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
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
