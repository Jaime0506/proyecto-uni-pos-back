# Plan de Implementación: Empleados por Tienda

**Fecha:** 4 de Octubre de 2026
**Estado:** Solo planificación. No se ha modificado código.
**Base:** [informe-analisis-gestion-empleados-tienda.md](file:///Users/jaimem/Dev/code/tesis/docs/informe-analisis-gestion-empleados-tienda.md) más las aclaraciones del usuario.

---

## 1. Requerimientos aclarados

| # | Requerimiento | Decisión del usuario |
| :-: | :--- | :--- |
| 1 | NIT de tienda | Se agrega como campo **opcional** al crear (y editar) una tienda. |
| 2 | Creación de usuario con acceso a tiendas | **A nivel empresa:** se eligen las tiendas a las que tendrá acceso (solo tiendas de la empresa actual). **Dentro de una tienda:** la tienda va marcada por defecto y no se puede modificar. El usuario **solo entra a las tiendas asignadas** (listado de tiendas disponibles al ingresar). |
| 3 | Username | **Inmutable** una vez generado. El resto de datos sí se editan. |
| 5 | Vista de empleados por tienda | Nueva vista "Usuarios de la tienda" en el menú que aparece al entrar a una tienda. |

Los requerimientos 2 y 5 están acoplados. La vista por tienda depende de que exista la asignación empleado↔tienda del punto 2.

---

## 2. Estado actual relevante (verificado en el código)

| Hallazgo | Evidencia | Implicación |
| :--- | :--- | :--- |
| Las tiendas visibles al ingresar salen de la **empresa**, no del usuario. | [`getUserCompanyAndStores`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L432-L488) devuelve todas las tiendas `ACTIVE` de la empresa. | Es el punto único donde aplicar el filtro de acceso. |
| El frontend carga las tiendas en `login` y `checkAuth` desde ese endpoint. | [`useAuth.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/hooks/useAuth.ts#L66-L76) y [`HomePage.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/home/HomePage.tsx) (selector de tienda). | Si el backend filtra, el selector y la barra de navegación se ajustan solos. |
| El backend de negocio **confía** en el `storeId` que manda el cliente. | `products`, `sales`, `reports`, `rewards`, `bonifications` reciben `storeId` por body o query y no validan que el usuario tenga acceso. | Filtrar solo la lista es una restricción de **UI**. La seguridad real exige un guard (Fase 7). |
| Los endpoints `/users/store/*` son de **empresa**, no de una tienda concreta. | [`users.controller.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.controller.ts#L142-L204) | Se conservan sin cambio de ruta. Los endpoints por tienda son nuevos. |
| `synchronize: true` en TypeORM. | [`typeorm.config.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/database/typeorm.config.ts) | Las entidades y columnas nuevas se crean al arrancar. **No hay migraciones**, así que los datos de respaldo (backfill) se aplican con SQL manual. |
| El username ya es inmutable en el código. | `updateUserWithRole` no toca `username` y `UpdateDto` no lo declara. `ValidationPipe` global sin `whitelist`. | Falta formalizarlo y reflejarlo en la UI. No hay que quitar nada. |
| El backend **no** valida duplicados de email o cédula al **editar**. | [`updateUserWithRole`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L625-L700) | Editar a un email repetido da un 500 (violación de unique). Se corrige de paso. |
| `PermissionGuard` resuelve permisos por el **rol activo más reciente** del usuario (sin tenant). Cachea 10 min en Redis. | [`my-permission-resolver.service.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/authorization-guard/my-permission-resolver.service.ts) | Los permisos nuevos tardan hasta 10 min en verse, salvo que se invalide la caché. `UsersModule` ya importa `AuthorizationGuardModule`, así que el resolver se puede inyectar. |
| La bitácora ya soporta `storeId`. | [`audit.service.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/audit/audit.service.ts#L17-L47) | Se puede auditar cada asignación con su tienda sin cambios de esquema. |

---

## 3. Decisiones que necesito confirmar antes de construir

| ID | Decisión | Recomendación | Alternativa |
| :-: | :--- | :--- | :--- |
| **D1** | En la vista de una tienda, "desactivar" un empleado: ¿qué afecta? | **Solo su acceso a esa tienda** (`UserStore.isActive`). La cuenta global se sigue desactivando desde la vista de empresa. | Desactivar la cuenta completa. Es más simple, pero cierra el acceso a todas sus tiendas. |
| **D2** | ¿Cómo entran a todas las tiendas el administrador de empresa y el primer admin creado por el super admin (la empresa puede no tener tiendas aún)? | **Nuevo permiso `store:access_all`**. Los roles que lo tengan ven todas las tiendas de la empresa, incluidas las futuras. | Asignar tiendas siempre de forma explícita. Bloquea al primer admin. |
| **D3** | Permisos para la vista por tienda | **4 permisos nuevos `store_user:*`**, separados de `user:*`. | Reutilizar `user:*`. No agrega permisos, pero quien administra usuarios de empresa y quien administra empleados de una tienda quedan atados al mismo permiso. |
| **D4** | Seguridad en el backend | Hacerlo en una **fase final opcional** (guard de acceso a tienda) con bandera de activación. | Dejarlo solo en UI, como hoy. |
| **D5** | Mínimo de tiendas al crear un usuario | **Al menos 1**, salvo que su rol tenga `store:access_all`. | Permitir 0. Crea usuarios que no pueden entrar a ninguna tienda. |

El resto del documento asume las recomendaciones.

---

## 4. Análisis de permisos

### 4.1 Permisos nuevos (5)

| Permiso | Uso | Dónde se exige |
| :--- | :--- | :--- |
| `store_user:read` | Ver empleados de la tienda seleccionada. | `GET users/by-store/get-all`. Ítem de menú "Usuarios de la tienda". |
| `store_user:create` | Crear un empleado asignado a la tienda actual. | `POST users/by-store/create-user`. |
| `store_user:update` | Editar un empleado de la tienda y reactivar su acceso. | `PATCH users/by-store/update-user` y `activate-user`. |
| `store_user:delete` | Quitar el acceso de un empleado a la tienda (D1). | `DELETE users/by-store/deactivate-user`. |
| `store:access_all` | Acceso a todas las tiendas de la empresa. No se asigna por usuario. | `getUserCompanyAndStores`, validaciones de asignación y el guard (Fase 7). |

### 4.2 Permisos existentes que se reutilizan sin cambio

| Permiso | Uso en este plan |
| :--- | :--- |
| `user:create` y `user:update` | Asignar y editar tiendas desde la vista de empresa. |
| `user_admin:create` y `user_admin:update` | Lo mismo desde la vista de super admin. |
| `store:read` | Sigue siendo el de la pantalla "Tiendas". **No se usa** para llenar el selector del formulario de usuario. |

### 4.3 Endpoint nuevo que necesita permiso propio

`GET stores/company/get-all` lista las tiendas de la empresa del solicitante (activas) para el selector del formulario de usuario. Se exige `{ anyOf: ['user:create', 'user:update'] }`. Sin esto, quien crea usuarios pero no tiene `store:read` no podría ver el selector. Además, el `GET stores/get-all` actual devuelve las tiendas de **todas** las empresas, por lo que no sirve para el formulario.

### 4.4 Riesgos de permisos a controlar

1. **Escalada de privilegios.** Desde la vista de tienda, un usuario con `store_user:create` podría asignar un rol que contenga `store:access_all`. Se **prohíbe** en el servicio: en la vista de tienda solo se aceptan roles sin `store:access_all`.
2. **Autoedición.** Un usuario no puede modificar sus propias tiendas ni su propio acceso.
3. **Caché de permisos (10 min).** Tras la migración, invalidar `perms:*` o aceptar la demora. No hay SCAN masivo implementado, y `invalidateByTenant` solo emite un warning.
4. **Roles que pierden `store:access_all`.** Si un rol lo pierde y el usuario no tiene tiendas asignadas, queda sin acceso. La edición de rol/usuario debe validarlo.

### 4.5 Alta de permisos y asignación

Los permisos se registran en `sys.permissions` (SQL o pantalla `/admin/permissions`, como ya se hace con los permisos de inventario). Se asignan por SQL a los roles existentes. Ver §8.

---

## 5. Diseño por requerimiento

### 5.1 Requerimiento 1: NIT opcional en tienda

**Backend**
- [`store.entity.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/stores/entities/store.entity.ts): agregar `nit` como `varchar(50)`, `nullable: true`. Sin restricción de unicidad: varias tiendas de la misma empresa pueden compartir NIT.
- [`create-store.dto.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/stores/dtos/create-store.dto.ts): `nit?` con `@IsOptional() @IsString() @Length(5, 50)`, igual que el formato mínimo de la empresa. `UpdateStoreDto` lo hereda por `PartialType`.
- [`stores.service.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/stores/stores.service.ts): en alta y edición, `nit` se normaliza con `trim()` y un valor vacío se guarda como `null`. En edición, enviar `""` limpia el NIT y omitir el campo lo deja igual.

**Frontend**
- [`globals.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/types/globals.ts): `Store.nit?: string | null`.
- [`store.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/services/store.ts): `nit?` en `CreateStoreDto`.
- [`StoreFormDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/stores/StoreFormDialog.tsx): campo "NIT (opcional)", con validación de longitud mínima **solo si hay valor**.
- [`StoresPage.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/admin/StoresPage.tsx): incluir `nit` en `updateDto`. Hoy el `updateDto` copia campo por campo y lo perdería.
- `StoresTable.tsx`: columna NIT, con "-" cuando no hay.

**Permisos:** ninguno nuevo. **Compatibilidad:** las tiendas existentes quedan con `nit = NULL`.

### 5.2 Requerimiento 3: username inmutable

- **Backend:** no se agrega ningún campo `username` a `UpdateDto` ni a `UpdateUserWithRoleDto`. Se deja un comentario en `updateUserWithRole` ("el username es inmutable por regla de negocio"). Un `username` enviado en el body se ignora sin error (no se activa `whitelist` global, que rompería otros endpoints).
- **Frontend ([`UserFormDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/users/UserFormDialog.tsx)):**
  - En edición, mostrar el `username` como campo **de solo lectura** con el texto "No se puede modificar".
  - En creación, mostrar una vista previa informativa "Se generará automáticamente".
  - Se aprovecha para quitar los `console.log('user', user)` duplicados del componente.
- **Corrección relacionada:** al editar, validar que el nuevo `email` o `nationalId` no pertenezca a otro usuario y devolver un 400 claro en vez de un 500.
- **Nota para el usuario:** como `nationalId` sigue siendo editable y el username incluye la cédula original, el username puede dejar de coincidir con la cédula actual. Es consecuencia de la regla; no se corrige.

**Permisos:** ninguno.

### 5.3 Requerimientos 2 y 5: asignación empleado↔tienda y vista por tienda

#### 5.3.1 Modelo de datos

Nueva entidad `UserStore` en `sys.user_stores`, con el mismo estilo de [`UserCompanyMembership`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/entities/user-company-membership.entity.ts):

| Columna | Tipo | Nota |
| :--- | :--- | :--- |
| `user_id` | uuid, PK | FK a `sys.users`. |
| `store_id` | int, PK | FK a `sys.stores`. |
| `company_id` | int | Denormalizado para filtrar por empresa y validar consistencia. |
| `is_active` | boolean, default true | Acceso activo a esa tienda (D1). |
| `assigned_by` | uuid, nullable | Quién la asignó. |
| `created_at`, `updated_at` | timestamptz | |

**Regla de consistencia:** `store.companyId == company_id == membership.companyId` del usuario. Se valida en el servicio en todo alta y edición.

Se crea un servicio pequeño y reutilizable, `UserStoresService`, con estos métodos. Así el filtro de acceso, el guard de la Fase 7 y los endpoints comparten la misma lógica:
- `getAccessibleStoreIds(userId, companyId)`: devuelve todas las tiendas de la empresa si el rol tiene `store:access_all` o el usuario es super root. Si no, solo las asignaciones activas.
- `hasAccess(userId, companyId, storeId)`.
- `assignStores(userId, companyId, storeIds, actorId)`, que sincroniza el conjunto.
- `listUsersByStore(storeId, companyId)`.

#### 5.3.2 Backend: cambios en endpoints existentes (compatibles)

| Endpoint | Cambio |
| :--- | :--- |
| `POST users/store/create-user` y `POST users/admin/create-user` | El DTO acepta `storeIds?: number[]` (`@IsArray @ArrayUnique @IsInt({each})`). Se valida que las tiendas existan, estén activas y sean de la empresa, y se aplica D5. Las filas de `user_stores` se crean **dentro de la misma transacción** de usuario, rol y membresía. |
| `PATCH users/store/update-user` y `PATCH users/admin/update-user` | Acepta `storeIds?`. Si viene, sincroniza (agrega, reactiva, desactiva el resto). Bloquea la autoedición, y bloquea dejar al usuario sin tiendas si su rol no tiene `store:access_all`. Si no viene, **no toca** las asignaciones. |
| `GET users/store/get-all-users` y `GET users/admin/get-all-users` | La respuesta suma `stores: [{ id, name, isActive }]` por usuario. Es un campo nuevo, así que las pantallas actuales no se rompen. |
| `GET users/get-user-company-and-stores` | **Cambio de comportamiento (se activa en la Fase 6):** devuelve solo `getAccessibleStoreIds`. Mismo formato de respuesta. |
| `PATCH users/admin/update-user` con cambio de `companyId` | Al cambiar de empresa, desactivar las asignaciones de la empresa anterior y exigir `storeIds` de la nueva. |

El fallback `companyId ?? 1` de las líneas 574 y 718 se elimina en este flujo, porque la asignación de tiendas exige empresa conocida.

#### 5.3.3 Backend: endpoints nuevos (vista por tienda)

Prefijo `users/by-store`. Todos reciben `storeId`, resuelven la empresa por la membresía del solicitante, y exigen que el solicitante tenga acceso a esa tienda.

| Método y ruta | Permiso | Comportamiento |
| :--- | :--- | :--- |
| `GET users/by-store/get-all?storeId=` | `store_user:read` | Empleados con asignación (activa o no) a esa tienda, con rol y estado de cuenta y de acceso. |
| `POST users/by-store/create-user` | `store_user:create` | Crea el usuario y **fuerza** `storeIds = [storeId]`. Rechaza roles con `store:access_all`. Exige que el rol sea de la empresa. |
| `PATCH users/by-store/update-user` | `store_user:update` | Edita datos y rol. **No** modifica asignaciones ni username. El objetivo debe estar asignado a esa tienda. |
| `PATCH users/by-store/activate-user` | `store_user:update` | Reactiva `UserStore.isActive`. |
| `DELETE users/by-store/deactivate-user` | `store_user:delete` | Desactiva `UserStore.isActive` (D1). No afecta a otras tiendas ni a la cuenta. |
| `GET stores/company/get-all` | `anyOf: user:create, user:update` | Tiendas activas de la empresa del solicitante, para el selector del formulario de empresa. |

Toda acción registra bitácora con `storeId` (`USER_STORE_ASSIGNED`, `USER_STORE_REVOKED`, `USER_STORE_ACTIVATED`).

**Cómo se evita duplicar lógica:** los endpoints `by-store` reutilizan `createUserWithRole` y `updateUserWithRole`, igual que hoy hace `createStoreUserWithRole`, y delegan en `UserStoresService`.

#### 5.3.4 Frontend: vista por empresa (selector de tiendas)

- [`users.types.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/services/users.types.ts): `storeIds?: number[]` en `CreateUserWithRoleDto` y `UpdateUserWithRoleDto`. En `User`, `stores?: { id; name; isActive }[]`.
- [`UserFormDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/users/UserFormDialog.tsx): nuevas props `stores`, `lockedStoreId?` e `isLoadingStores`.
  - **Vista de empresa:** selección múltiple de tiendas (casillas), con el requisito de al menos 1 (salvo rol con acceso total, que el backend también valida). Solo se listan las tiendas de la empresa actual.
  - **Vista de tienda:** la tienda aparece marcada y deshabilitada (`lockedStoreId`), sin posibilidad de cambiarla.
  - En el flujo de super admin, el listado se recarga al cambiar la empresa, igual que ya pasa con los roles.
- [`StoreUsersPage.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/store/StoreUsersPage.tsx) y [`AdminUsersPage.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/admin/AdminUsersPage.tsx): cargar las tiendas y pasar `storeIds` al guardar. Hoy el `updateDto` se arma campo por campo, y `storeIds` debe incluirse o se perdería.
- [`UsersTable.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/users/UsersTable.tsx): columna opcional "Tiendas" mediante una prop, para no cambiar las tablas actuales. Además, una prop opcional para sustituir los permisos que habilitan las acciones (hoy son `user:*` y `user_admin:*`), que usa la vista por tienda con `store_user:*`.

#### 5.3.5 Frontend: vista dentro de la tienda (Req. 5)

- **Menú:** en [`menuItemsStore.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/utils/menuItemsStore.tsx), un grupo nuevo "Equipo" con el ítem "Usuarios de la tienda" (`permissions: ['store_user:read']`).
- **Ruta:** `/store-users` en [`AppRoutes.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/routes/AppRoutes.tsx). No se reutiliza `/users`, que sigue siendo la vista de empresa.
- **Página nueva** `StoreEmployeesPage.tsx`, con pestañas Activos, Inactivos y Todos, como las páginas actuales. Usa `selectedStoreId` del estado global y no hace llamadas si no hay tienda seleccionada. Reutiliza `UsersHeader`, `UsersTable`, `UserFormDialog` y los diálogos de activar y desactivar, con textos adaptados ("Quitar acceso a esta tienda").
- **Hook y servicio nuevos** (`useStoreEmployees`, `users.by-store.service.ts`) siguiendo el patrón de [`STORE_CONTEXT.md`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/store/STORE_CONTEXT.md).
- **Tienda bloqueada:** al crear, el formulario recibe `lockedStoreId = selectedStoreId`.
- **Barra lateral de empresa:** el ítem "Usuarios" actual queda intacto. Se mantiene "Bitácora" y los demás.

#### 5.3.6 Qué ve el usuario al ingresar (acceso restringido)

1. `login` y `checkAuth` llaman a `getUserCompanyAndStores`, que ahora devuelve solo las tiendas accesibles.
2. `HomePage` y el selector de la barra de navegación muestran esa lista. Si está vacía, aparece el mensaje existente "No tienes tiendas asignadas".
3. Ajuste menor en [`useAuth.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/hooks/useAuth.ts): hoy `setStores` solo se despacha si hay tiendas; conviene despacharlo también con lista vacía para no dejar tiendas de una sesión anterior. A verificar que `logout` reinicie el estado de tiendas.

#### 5.3.7 Seguridad real en el backend (Fase 7, opcional según D4)

`StoreAccessGuard` y un decorador `@RequireStoreAccess()` que lee `storeId` del body, query o params, y comprueba `UserStoresService.hasAccess`.
- Super root y `store:access_all` pasan siempre.
- Se aplica **por controlador y de forma gradual**: `products`, `sales`, `reports`, `rewards`, `bonifications` y, con revisión, `customers`.
- **No** se aplica a `customer-portal` (cliente final, sin sesión de empleado).
- Se activa con una variable de entorno `ENFORCE_STORE_ACCESS` (apagada por defecto), para poder desplegar y comprobar sin riesgo.
- Hay que revisar los endpoints que hoy reciben `storeId` como opcional, por ejemplo en reportes, antes de volverlo obligatorio.

---

## 6. Matriz de compatibilidad: qué podría romperse y cómo se evita

| Riesgo | Causa | Mitigación |
| :--- | :--- | :--- |
| Usuarios existentes quedan sin tiendas y no pueden entrar. | Tabla nueva vacía. | **Backfill obligatorio antes de activar el filtro** (§8): cada usuario con membresía activa recibe todas las tiendas de su empresa. Comportamiento idéntico al actual. |
| Admins pierden acceso a tiendas nuevas. | Dependen de asignaciones explícitas. | `store:access_all` asignado por SQL a los roles administradores. |
| El formulario de usuario deja de guardar. | El backend exige `storeIds` (D5). | Backend y frontend se publican juntos. Los usuarios sin tiendas obtienen un mensaje claro, no un 500. Los roles con `store:access_all` están exentos. |
| `updateDto` del frontend pierde `storeIds` o `nit`. | Los `updateDto` copian campo por campo. | Está listado en cada cambio. Se verifica con prueba manual de edición. |
| Cambio de empresa de un usuario o de una tienda deja asignaciones huérfanas. | `updateStore` permite cambiar `companyId`. | Al cambiar la empresa de un usuario se reemplazan las asignaciones. Se **prohíbe** mover una tienda de empresa si tiene usuarios o datos asociados. |
| Permisos nuevos no visibles de inmediato. | Caché Redis de 10 min. | Documentado. Invalidar `perms:*` tras asignar. |
| Rutas y menús actuales cambian. | Ninguna ruta existente se reutiliza. | `/users`, `/roles`, `/audit` y `/admin/*` no se tocan. Solo se agrega `/store-users`. |
| Un cliente con `storeId` falso accede a otra tienda. | El backend no valida acceso (problema previo). | Fase 7. Mientras tanto la restricción es solo de interfaz. |
| La edición con email o cédula duplicada da 500. | Falta de validación previa (error ya existente). | Se corrige en §5.2. |

---

## 7. Orden de implementación (fases)

Cada fase es desplegable por separado y deja el sistema funcionando.

| Fase | Contenido | Cambia comportamiento visible |
| :-: | :--- | :---: |
| **1** | NIT opcional (backend y frontend). | Solo el campo nuevo. |
| **2** | Username de solo lectura en el formulario, validación de duplicados al editar. | Mensajes de error y campo de lectura. |
| **3** | Entidad `UserStore`, `UserStoresService`, alta de permisos nuevos, **backfill SQL** (§8). | No. |
| **4** | Backend: `storeIds` en alta y edición, `stores` en listados, endpoints `by-store`, `stores/company/get-all`, bitácora. El filtro de `getUserCompanyAndStores` sigue **apagado**. | No. |
| **5** | Frontend: selector de tiendas en el formulario de empresa y de admin, columna "Tiendas", y la vista "Usuarios de la tienda" con su menú y ruta. | Sí, nuevas pantallas y campos. |
| **6** | **Activar el filtro** en `getUserCompanyAndStores` (solo tiendas asignadas). | Sí, solo después de comprobar el backfill. |
| **7** | `StoreAccessGuard` con bandera `ENFORCE_STORE_ACCESS`, aplicado por módulos. | Opcional. |

**Punto de control antes de la Fase 6:** verificar con una consulta que todo usuario con membresía activa tenga al menos una fila en `user_stores` o un rol con `store:access_all`.

---

## 8. Datos y SQL previstos (a ejecutar manualmente, de forma idempotente)

```sql
-- 1) Permisos nuevos
INSERT INTO sys.permissions (name, description, status, created_at, updated_at) VALUES
 ('store_user:read',   'Ver empleados de la tienda seleccionada', 'ACTIVE', NOW(), NOW()),
 ('store_user:create', 'Crear empleados asignados a la tienda seleccionada', 'ACTIVE', NOW(), NOW()),
 ('store_user:update', 'Editar empleados de la tienda y reactivar su acceso', 'ACTIVE', NOW(), NOW()),
 ('store_user:delete', 'Quitar el acceso de un empleado a la tienda', 'ACTIVE', NOW(), NOW()),
 ('store:access_all',  'Acceso a todas las tiendas de la empresa', 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2) store_user:* a los roles que hoy tienen el permiso equivalente user:*
--    (user:read -> store_user:read, user:create -> store_user:create, etc.)

-- 3) store:access_all a los roles administradores (criterio por nombre, como en listado-permisos-sistema.md)

-- 4) Backfill de asignaciones: cada membresía activa recibe todas las tiendas
--    activas de su empresa (comportamiento actual preservado).
INSERT INTO sys.user_stores (user_id, store_id, company_id, is_active, created_at, updated_at)
SELECT m.user_id, s.id, m.company_id, TRUE, NOW(), NOW()
FROM sys.user_company_memberships m
JOIN sys.stores s ON s.company_id = m.company_id AND s.deleted_at IS NULL
WHERE m.is_active = TRUE
ON CONFLICT DO NOTHING;
```

Los nombres exactos de columnas y del enum de estado se confirman contra el esquema real antes de ejecutarlo. El documento [listado-permisos-sistema.md](file:///Users/jaimem/Dev/code/tesis/docs/listado-permisos-sistema.md) se amplía con estos permisos al implementar.

---

## 9. Casos límite a cubrir

1. Usuario con rol `store:access_all` y sin asignaciones: debe ver todas las tiendas y las nuevas.
2. Usuario con una sola tienda: no se puede quitar su última tienda si su rol no tiene acceso total.
3. Tienda desactivada o eliminada (soft-delete): no aparece en el selector ni en el formulario. Sus asignaciones se conservan y se reactivan con la tienda.
4. Usuario desactivado a nivel cuenta: sigue sin poder ingresar, sin importar sus asignaciones. La reactivación de cuenta ([`activateStoreUser`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/users.service.ts#L260-L326)) no modifica las asignaciones.
5. Crear un usuario desde una tienda: queda asignado solo a esa tienda y, si su rol no tiene acceso total, no ve las demás en su selector.
6. Editar desde la vista de tienda un usuario que pertenece a varias tiendas: no altera sus otras asignaciones.
7. Super admin crea un usuario de una empresa sin tiendas: solo es válido con un rol con `store:access_all`.
8. Cambiar el rol de un usuario de uno con acceso total a otro sin él: exige tiendas asignadas.
9. El usuario nunca puede editar sus propias tiendas ni su propio acceso.
10. Un usuario que cambia de tienda en la barra de navegación solo ve las tiendas accesibles.

---

## 10. Pruebas propuestas

**Backend (unitarias de `UserStoresService` y de los servicios tocados):** alta con y sin `storeIds`, tienda de otra empresa rechazada, rol con acceso total, sincronización de asignaciones, autoedición bloqueada, escalada por rol bloqueada, NIT vacío igual a `null`.

**Pruebas manuales de regresión (checklist):**
- Login de admin de empresa: ve todas sus tiendas. Login de empleado asignado a una: ve solo esa.
- CRUD de tiendas con y sin NIT. Edición de una tienda existente sin NIT no lo exige.
- Crear, editar, desactivar y reactivar usuarios en las pantallas actuales (empresa y admin).
- Crear usuario desde la vista de tienda: tienda bloqueada, sin acceso a otras tiendas.
- Ventas, productos, reportes y campañas siguen funcionando para un administrador y para un cajero.
- Bitácora registra las nuevas acciones con la tienda.

Verificación técnica de cierre en ambos proyectos con `pnpm run build` y `pnpm run lint`.

---

## 11. Resumen de archivos a tocar

| Área | Archivos |
| :--- | :--- |
| Backend, nuevos | `user-store.entity.ts`, `user-stores.service.ts`, DTOs `by-store`, `store-access.guard.ts` (Fase 7) |
| Backend, modificados | `store.entity.ts`, `create-store.dto.ts`, `stores.service.ts`, `stores.controller.ts`, `create-user-with-role.dto.ts`, `update-user-with-role.dto.ts`, `users.service.ts`, `users.controller.ts`, `users.module.ts` |
| Frontend, nuevos | `StoreEmployeesPage.tsx`, `useStoreEmployees.ts`, `users.by-store.service.ts` |
| Frontend, modificados | `globals.ts`, `store.ts`, `users.types.ts`, `StoreFormDialog.tsx`, `StoresPage.tsx`, `StoresTable.tsx`, `UserFormDialog.tsx`, `UsersTable.tsx`, `StoreUsersPage.tsx`, `AdminUsersPage.tsx`, `menuItemsStore.tsx`, `AppRoutes.tsx`, `useAuth.ts` |
| Documentación | `listado-permisos-sistema.md` (permisos nuevos) |
