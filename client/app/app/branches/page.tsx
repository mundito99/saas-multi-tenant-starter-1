'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  branchesApi,
  type Branch,
  type CreateBranchRequest,
  type UpdateBranchRequest,
} from '@/lib/api';
import { Loader2 } from 'lucide-react';

const INITIAL_CREATE_FORM: CreateBranchRequest = {
  name: '',
  slug: '',
  code: '',
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateBranchRequest>({});
  const [createForm, setCreateForm] = useState<CreateBranchRequest>(INITIAL_CREATE_FORM);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await branchesApi.list();
      setBranches(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      await branchesApi.create({
        name: createForm.name,
        slug: createForm.slug || undefined,
        code: createForm.code || undefined,
      });
      setCreateForm(INITIAL_CREATE_FORM);
      await loadBranches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setEditForm({
      name: branch.name,
      slug: branch.slug,
      code: branch.code || '',
      status: branch.status,
    });
  };

  const handleUpdate = async (branchId: string) => {
    try {
      setSaving(true);
      setError(null);
      await branchesApi.update(branchId, {
        name: editForm.name,
        slug: editForm.slug,
        code: editForm.code || undefined,
        status: editForm.status,
      });
      setEditingBranchId(null);
      setEditForm({});
      await loadBranches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    const confirmed = window.confirm('Delete this branch?');
    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);
      await branchesApi.remove(branchId);
      await loadBranches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Tenant-scoped branch management. Platform does not create or administer branches.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Create branch</CardTitle>
              <CardDescription>Base UI to keep the branch flow clean and consistent</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="branchName">Name</Label>
                  <Input
                    id="branchName"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="North HQ"
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchSlug">Slug</Label>
                  <Input
                    id="branchSlug"
                    value={createForm.slug || ''}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="north-hq"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchCode">Code</Label>
                  <Input
                    id="branchCode"
                    value={createForm.code || ''}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="BR-001"
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create branch
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branch list</CardTitle>
              <CardDescription>Use this base screen to continue the full branch UI later</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {branches.map((branch) => {
                    const isEditing = editingBranchId === branch.id;

                    return (
                      <div key={branch.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                        {isEditing ? (
                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={editForm.name || ''}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Slug</Label>
                              <Input
                                value={editForm.slug || ''}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Code</Label>
                              <Input
                                value={editForm.code || ''}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                value={editForm.status || 'ACTIVE'}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    status: e.target.value as 'ACTIVE' | 'INACTIVE',
                                  }))
                                }
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                              </select>
                            </div>
                            <div className="md:col-span-4 flex gap-2">
                              <Button disabled={saving} onClick={() => handleUpdate(branch.id)}>
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={saving}
                                onClick={() => {
                                  setEditingBranchId(null);
                                  setEditForm({});
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h2 className="font-semibold">{branch.name}</h2>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                  {branch.status}
                                </span>
                                {branch.isMain && (
                                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                                    MAIN
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Slug: {branch.slug}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Code: {branch.code || '—'}</p>
                            </div>

                            <div className="flex gap-2">
                              <Button variant="outline" disabled={saving} onClick={() => startEdit(branch)}>
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                disabled={saving || branch.isMain}
                                onClick={() => handleDelete(branch.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {branches.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-500">No branches found.</p>
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
