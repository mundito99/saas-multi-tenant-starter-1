# tenant-scoped branches refactor files

Este paquete contiene los archivos listos para copiar sobre la rama:

`feature/platform-super-admin-branches-apply`

## Objetivo cubierto
- platform queda sólo para tenant management
- branches pasa a módulo tenant-scoped
- se elimina el flujo `POST /platform/tenants/:tenantId/branches`
- se agrega base frontend para `/app/branches`
- se corrige registro para que ya no intente crear tenant

## Archivos nuevos
- `api/src/branches/branches.module.ts`
- `api/src/branches/branches.controller.ts`
- `api/src/branches/branches.service.ts`
- `api/src/branches/dto/create-branch.dto.ts`
- `api/src/branches/dto/update-branch.dto.ts`
- `client/app/app/branches/page.tsx`

## Archivos a reemplazar
- `api/src/app.module.ts`
- `api/src/platform/dto/create-tenant.dto.ts`
- `api/src/platform/platform.controller.ts`
- `api/src/platform/platform.service.ts`
- `client/contexts/auth-context.tsx`
- `client/lib/api.ts`
- `client/components/dashboard-layout.tsx`
- `client/app/register/page.tsx`
- `client/app/app/platform/page.tsx`

## Limpieza opcional
Puedes borrar este archivo si quieres mantener más limpio el módulo platform:
- `api/src/platform/dto/create-branch.dto.ts`

## Nota de permisos
El tenant admin con rol `OWNER` funcionará de inmediato porque `PermissionGuard` ya da bypass a OWNER.

Para roles custom, crea estos permisos en tu tabla `Permission` o por tu endpoint de permissions:
- `branch.view`
- `branch.create`
- `branch.update`
- `branch.delete`
