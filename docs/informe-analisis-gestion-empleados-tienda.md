# Informe de Análisis: Gestión de Empleados de Tienda

**Fecha:** 4 de Octubre de 2026
**Alcance:** `proyecto-uni-pos-back` (rama `jaime`, commit `86c7b67`) y `proyecto-uni-pos-front` (commit `5b43557`).
**Estado global:** **Parcialmente cumplido (~60%)**. La gestión de usuarios (crear/editar/activar/listar) existe y funciona a nivel de *empresa*, pero **no existe vínculo empleado ↔ tienda**, que es el eje del requerimiento.

---

## 1. Resumen ejecutivo

| # | Característica solicitada | Estado | Resumen |
| :-: | :--- | :---: | :--- |
| 1 | Registrar tienda con nombre, **NIT**, dirección | ⚠️ Parcial | Se registra tienda con nombre, dirección, teléfono, email. **El NIT no existe en `Store`**; vive en `Company`. |
| 2 | Crear empleados **asociados a una tienda específica** con usuario, contraseña y rol | ❌ / ⚠️ | Se crean asociados a la **empresa**, no a una tienda. **El usuario no se elige**: se autogenera. |
| 3 | Editar empleados (incluye credenciales y rol) | ⚠️ Parcial | Edita datos, contraseña y rol. **No se puede editar el username**; queda desactualizado si cambia nombre/cédula. |
| 4 | Activar / desactivar cuentas | ✅ Completo | Desactivar y reactivar implementados (back + front) con bitácora. |
| 5 | Listar empleados **por tienda** con estado y rol | ❌ / ⚠️ | Listado por **empresa** con estado y rol. No hay filtro ni vista por tienda. |

---

## 2. Hallazgos por característica

### 2.1 Registro de tienda (NIT, nombre, dirección)

**Qué existe**
- Entidad [`Store`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/stores/entities/store.entity.ts): `name`, `code`, `address`, `phone`, `email`, `status`, `isActive`, único por `(companyId, name)`.
- CRUD completo en [`stores.controller.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/stores/stores.controller.ts) protegido con `store:create|read|update|delete`, con validación del límite `maxStores` de la empresa ([`stores.service.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/stores/stores.service.ts#L44-L97)).
- Front: [`StoresPage.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/admin/StoresPage.tsx) y [`StoreFormDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/stores/StoreFormDialog.tsx).

**Brechas**
1. **NIT ausente en la tienda.** El NIT (único) está en [`Company`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/companies/entities/company.entity.ts#L19-L20) y se captura en `CompanyFormDialog`. [`CreateStoreDto`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/stores/dtos/create-store.dto.ts) y el formulario de tienda no lo piden. Si el requerimiento lo exige literalmente por tienda, falta columna, DTO, validación y campo en UI. Si se interpreta "tienda = empresa", el requisito se cumple vía el módulo de Empresas.
2. **Dirección opcional.** `address` es `nullable` y `@IsOptional()`; el requerimiento la lista como dato básico.
3. **Sin validación de email** en backend (`@IsEmail()` comentado en el DTO).
4. **Seguridad multi-tenant (importante).** `createStore`/`updateStore` aceptan `companyId` del body sin compararlo con la empresa del solicitante, y `getAllStores` devuelve tiendas de **todas** las empresas (`withDeleted: true`). Un usuario con `store:create` podría crear/mover tiendas en otra empresa.
5. **Mensajes engañosos:** `deleteStore` responde "eliminada" pero es un soft-delete.

### 2.2 Creación de empleados asociados a una tienda

**Qué existe**
- `POST /users/store/create-user` y `/users/admin/create-user` ([`users.service.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L490), [`createStoreUserWithRole`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L967-L1002)).
- Transacción que crea `User` (contraseña con bcrypt), `UserRole` y `UserCompanyMembership`. Valida unicidad de email, cédula y username, y que el rol pertenezca a la empresa.

**Brechas**
1. **No existe relación empleado ↔ tienda.** Las únicas vinculaciones son [`UserCompanyMembership`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/entities/user-company-membership.entity.ts) y [`UserRole`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/authorization/entities/user-role.entity.ts), ambas con `companyId`. Una búsqueda de `storeId` en los módulos `users`, `authorization` y `auth` no arroja resultados. Consecuencias:
   - Todo empleado de la empresa ve y opera **todas** las tiendas de la empresa.
   - No se puede restringir un cajero a una sola sucursal.
   - Los roles y permisos son por empresa, no por tienda.
   - El selector de tienda del front (`selectedStoreId`) es solo contexto de UI y no una restricción de acceso.
2. **El usuario no se asigna manualmente.** El username se genera con `createUserName(firstName, lastName, nationalId)` ([línea 548](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L547-L548)); `RegisterDto` no lo recibe. El requerimiento dice "asignándoles usuario".
3. **Fallback inseguro a empresa 1.** Si no llega `companyId`, se usa `1` por defecto (líneas [574](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L574) y [718](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L718)). Aplica en el flujo admin.
4. `roleId` es `@IsOptional()` en [`CreateUserWithRoleDto`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/dtos/create-user-with-role.dto.ts): se puede crear un empleado sin rol, contra "rol correspondiente".
5. Contraseña: solo `MinLength(6)`, sin política de complejidad.

### 2.3 Edición de empleados

**Qué existe**
- `PATCH /users/store/update-user` y `/users/admin/update-user` ([`updateUserWithRole`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L625)): nombres, email, cédula, teléfono, **contraseña** y **rol**. Ahora busca con `withDeleted: true`, por lo que ya se puede editar un usuario inactivo (el informe previo señalaba lo contrario). El admin de empresa solo edita usuarios de su empresa y con roles de su empresa.
- Front: [`UserFormDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/users/UserFormDialog.tsx).

**Brechas**
1. **Username inmutable y se desincroniza.** Si se cambia nombre o cédula, el `username` no se recalcula ni se puede editar. El requerimiento menciona editar "credenciales de acceso".
2. **No se puede reasignar de tienda** (consecuencia de 2.2.1).
3. Al cambiar contraseña no se invalidan las sesiones activas del empleado (a verificar en `Session`).

### 2.4 Activar / desactivar cuentas ✅

- Desactivar: `DELETE /users/store/delete-user` (`deletedAt` + `isActive=false`), con bloqueo inmediato de login y de tokens.
- Activar: `PATCH /users/store/activate-user` ([`activateStoreUser`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L260-L326)) restaura usuario, membresía y rol. Registra auditoría (`USER_ACTIVATED`/`USER_DEACTIVATED`).
- Pendientes menores:
  - `deleteStoreUser` busca el usuario sin `withDeleted`, por lo que desactivar dos veces devuelve "no encontrado".
  - No se impide que un admin se desactive a sí mismo.
  - Al desactivar no se cierran explícitamente las filas de `Session` (la invalidación depende de que `JwtStrategy` compruebe `isActive`).

### 2.5 Listado de empleados por tienda

**Qué existe**
- `GET /users/store/get-all` ([`getStoreUsers`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L842-L933)): usuarios de la empresa del solicitante, incluyendo inactivos, con rol y empresa.
- Front: [`StoreUsersPage.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/store/StoreUsersPage.tsx) y `UsersTable` con `StatusBadge` (estado) y rol.

**Brechas**
1. **El listado es por empresa, no por tienda.** No hay parámetro `storeId`, ni columna "Tienda", ni agrupación.
2. **Ubicación en el menú.** "Usuarios" está en la sección "Configuración de Empresa" ([`menuItems.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/utils/menuItems.tsx#L83-L90)); el menú de tienda ([`menuItemsStore.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/utils/menuItemsStore.tsx)) no tiene entrada de empleados.
3. Sin paginación ni búsqueda en servidor: se cargan todos los usuarios en una sola consulta.

---

## 3. Matriz resumen de brechas

| Prioridad | Brecha | Impacto | Esfuerzo estimado |
| :---: | :--- | :--- | :---: |
| 🔴 Alta | No existe relación empleado ↔ tienda (tabla `sys.user_store_assignments` o similar) | Incumple el núcleo del requerimiento (crear, listar y restringir por tienda) | Alto |
| 🔴 Alta | `StoresController` no valida la empresa del solicitante (`companyId` del body, `getAllStores` global) | Fuga y manipulación entre tenants | Bajo |
| 🟠 Media | NIT no existe en `Store` | Incumple literalmente "datos básicos (nombre, NIT, dirección)" | Bajo |
| 🟠 Media | El username no es asignable ni editable | Incumple "asignándoles usuario" y "editar credenciales" | Medio |
| 🟠 Media | `roleId` opcional al crear empleado | Cuentas sin privilegios definidos | Bajo |
| 🟡 Baja | Fallback `companyId = 1` | Riesgo de asignación a empresa equivocada | Bajo |
| 🟡 Baja | Dirección y email de tienda sin validación obligatoria | Calidad de datos | Bajo |
| 🟡 Baja | Sin paginación / filtros en listado de empleados | Escalabilidad | Medio |

---

## 4. Propuesta de implementación

1. **Asignación a tienda:** crear entidad `UserStore` (`userId`, `storeId`, `companyId`, `isActive`). Agregar `storeId` obligatorio en `CreateUserWithRoleDto`, `GET /users/store/get-all?storeId=`, y validar en el guard de las rutas de tienda que el usuario esté asignado a `storeId`.
2. **Front:** selector de tienda en `UserFormDialog`, columna "Tienda" y filtro en `UsersTable`, y entrada "Empleados" en `menuItemsStore.tsx` filtrada por `selectedStoreId`.
3. **Tiendas:** columna `nit` en `Store` (nullable con migración, único por empresa), campo obligatorio en DTO y formulario; `address` obligatoria; `@IsEmail()`. Forzar `companyId` desde la membresía del solicitante y filtrar `getAllStores` por empresa salvo super-admin.
4. **Credenciales:** permitir `username` opcional en el alta (con unicidad) y editable en la edición; invalidar sesiones al cambiar contraseña.
5. **Roles:** hacer `roleId` obligatorio en alta de empleados y eliminar el fallback a empresa `1`.

> [!NOTE]
> Antes de empezar conviene decidir si "tienda" en el requerimiento equivale a "empresa" (en cuyo caso solo faltarían los puntos 4 y 5) o si un empleado debe pertenecer a una sucursal concreta (se requiere el punto 1 completo).
