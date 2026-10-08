# Resumen de Implementación: Módulo Gestión de Empleados de Tienda

> **Fecha:** 2026-10-04  
> **Estado:** Implementado y Verificado con éxito (`pnpm run build` en Back & Front sin errores)

---

## 1. Alcance y Decisiones del Usuario Aplicadas

Se implementaron todos los requerimientos del módulo **Gestión de Empleados de Tienda** respetando las decisiones acordadas:

1. **Requerimiento 1 (NIT de Tienda Opcional):**
   - Agregada la columna `nit` (`varchar(50)`, opcional/nullable) a la entidad `Store`.
   - Modificados DTOs `CreateStoreDto` y `UpdateStoreDto` para aceptar `nit?: string`.
   - Actualizado el frontend (`StoreFormDialog.tsx`, `StoresTable.tsx`, `store.ts`, `globals.ts`) con campo opcional y visualización en tabla.
   - Creado endpoint `GET /stores/company/get-all` para listar tiendas activas de la empresa del usuario autenticado.

2. **Requerimiento 2 y 5 (Asignación de Tiendas & Vista en Tienda):**
   - **Nivel Empresa (`/users`):** Al crear o editar un usuario, se despliegan las tiendas de la empresa para asignarle acceso múltiple o ninguna tienda (**Decisión D5**).
   - **Nivel Tienda (`/store-users`):** Nueva vista dedicada de empleados dentro del contexto de la tienda seleccionada. Al crear o editar empleados desde esta vista, la tienda queda fijada por defecto (`lockedStoreId`) y no es modificable.
   - **Acceso en Login/Menú:** En el login (`getUserCompanyAndStores`), el usuario únicamente recibe y puede ingresar a las tiendas a las que tiene asignación activa (`sys.user_stores.is_active = true`), salvo que posea permiso `store:access_all` o sea administrador (**Decisión D2**).

3. **Requerimiento 3 (Nombre de Usuario Inmutable):**
   - El campo `username` es de sólo lectura y visualmente deshabilitado en modo edición.
   - Al crear un usuario se informa que el nombre de usuario se autogenera a partir del nombre y apellido de forma inmutable.

4. **Requerimiento 4 & Decisión D4 (Seguridad a Nivel de Tienda en Backend):**
   - Implementado el guard `StoreAccessGuard` (`src/modules/auth/guards/store-access.guard.ts`).
   - Valida si el usuario tiene permiso `store:access_all`, es administrador, o posee registro activo en `sys.user_stores` para el `storeId` enviado por body, query o params.
   - Aplicado a `SalesController`, `ProductsController` y los endpoints de `UsersController` por tienda.

5. **Decisión D1 (Desactivación de Empleado en Tienda):**
   - Al desactivar un empleado en la vista de tienda, únicamente se suspende el acceso a esa tienda (`sys.user_stores.isActive = false`), sin desactivar al usuario globalmente ni en otras tiendas.

6. **Decisión D3 (Nuevos Permisos de Seguridad):**
   - Creados 5 permisos dedicados: `store_user:read`, `store_user:create`, `store_user:update`, `store_user:delete`, `store:access_all`.
   - Documentados con sus sentencias SQL de inserción y asignación en [`docs/listado-permisos-sistema.md`](file:///Users/jaimem/Dev/code/tesis/docs/listado-permisos-sistema.md).

---

## 2. Archivos Creados y Modificados

### Backend (`proyecto-uni-pos-back`)
| Tipo | Archivo | Descripción |
| :--- | :--- | :--- |
| **Nuevo** | `src/modules/users/entities/user-store.entity.ts` | Entidad `UserStore` mapeada a la tabla `sys.user_stores`. |
| **Nuevo** | `src/modules/users/dtos/by-store-user.dto.ts` | DTOs `CreateStoreEmployeeDto`, `UpdateStoreEmployeeDto`, `StoreUserActionDto`. |
| **Nuevo** | `src/modules/auth/guards/store-access.guard.ts` | Guard de seguridad multi-tenant para acceso por tienda. |
| **Modificado** | `src/modules/stores/entities/store.entity.ts` | Agregada columna opcional `nit`. |
| **Modificado** | `src/modules/stores/dtos/create-store.dto.ts` | Campo `nit?: string` opcional. |
| **Modificado** | `src/modules/stores/stores.service.ts` | Métodos `createStore`, `updateStore` y `getCompanyStores`. |
| **Modificado** | `src/modules/stores/stores.controller.ts` | Endpoint `GET /stores/company/get-all`. |
| **Modificado** | `src/modules/users/users.service.ts` | Métodos `getUsersByStore`, `createStoreEmployee`, `updateStoreEmployee`, `activateStoreEmployee`, `deactivateStoreEmployee`, helpers `userHasStoreAccessAll` y `userHasAccessToStore`. |
| **Modificado** | `src/modules/users/users.controller.ts` | Endpoints protegidos `/users/by-store/*`. |
| **Modificado** | `src/modules/users/users.module.ts` | Registro del repositorio `UserStore`. |
| **Modificado** | `src/modules/auth/authorization-guard/*` | Registro y exportación de `StoreAccessGuard`. |
| **Modificado** | `src/modules/sales/sales.controller.ts` | Protección con `StoreAccessGuard`. |
| **Modificado** | `src/modules/products/products.controller.ts` | Protección con `StoreAccessGuard`. |

### Frontend (`proyecto-uni-pos-front`)
| Tipo | Archivo | Descripción |
| :--- | :--- | :--- |
| **Nuevo** | `src/services/users.by-store.service.ts` | Cliente HTTP Axios para endpoints `/users/by-store/*`. |
| **Nuevo** | `src/hooks/useStoreEmployees.ts` | Hook para consultar y mutar empleados de la tienda activa. |
| **Nuevo** | `src/pages/store/StoreEmployeesPage.tsx` | Página completa de Empleados de Tienda con tabs de estado. |
| **Modificado** | `src/types/globals.ts` | Tipado de `Store.nit` y campos `stores`, `store`, `isStoreActive` en `User`. |
| **Modificado** | `src/services/users.types.ts` | `storeIds` en DTOs de usuario y nuevos DTOs de tienda. |
| **Modificado** | `src/services/store.ts` | `StoreService.getCompanyStores()` e instancia `storeService`. |
| **Modificado** | `src/components/users/UserFormDialog.tsx` | Username inmutable, selección de tiendas múltiples / tienda fija (`lockedStoreId`). |
| **Modificado** | `src/components/users/UsersTable.tsx` | Columnas "Rol" y "Tiendas", badges de tiendas asignadas y permisos dinámicos. |
| **Modificado** | `src/components/users/UsersHeader.tsx` | Título, descripción y permisos de creación configurables. |
| **Modificado** | `src/components/stores/StoreFormDialog.tsx` | Input opcional para NIT de tienda. |
| **Modificado** | `src/components/stores/StoresTable.tsx` | Columna NIT en tabla de tiendas. |
| **Modificado** | `src/pages/store/StoreUsersPage.tsx` | Carga de tiendas de empresa y asignación a usuarios. |
| **Modificado** | `src/pages/admin/AdminUsersPage.tsx` | Propagación de `storeIds` al actualizar usuarios. |
| **Modificado** | `src/routes/AppRoutes.tsx` | Registro de ruta `/store-users` -> `StoreEmployeesPage`. |
| **Modificado** | `src/utils/menuItemsStore.tsx` | Item "Empleados" en el menú lateral de tienda (`store_user:read`). |

---

## 3. Pruebas de Compilación y Calidad

- **Backend:**
  ```bash
  cd proyecto-uni-pos-back && pnpm run build
  # Resultado: Found 0 issues. Successfully compiled: 148 files with swc.
  ```
- **Frontend:**
  ```bash
  cd proyecto-uni-pos-front && pnpm run build
  # Resultado: tsc -b && vite build -> ✓ built in 2.04s sin errores.
  ```
- **Linter Frontend (archivos modificados):**
  ```bash
  pnpm eslint src/pages/store/StoreEmployeesPage.tsx src/hooks/useStoreEmployees.ts src/services/users.by-store.service.ts src/components/users/UserFormDialog.tsx src/components/users/UsersTable.tsx src/pages/store/StoreUsersPage.tsx
  # Resultado: 0 errores, 0 warnings.
  ```
