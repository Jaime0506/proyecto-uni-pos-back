# Guía y Listado de Permisos para Registro en Base de Datos

Este documento contiene el catálogo oficial de permisos requeridos por el sistema POS Multi-Tenant, incluyendo los permisos para el módulo de **Gestión de Empleados de Tienda** y el módulo de **Inventario**, con sus respectivas sentencias SQL para inserción y asignación automática.

---

## 1. Nuevos Permisos: Gestión de Empleados de Tienda (Store Employees)

Estos 5 permisos permiten la administración delegada y segura del personal de cada tienda física, garantizando el aislamiento de sucursales:

| Nombre del Permiso (`name`) | Descripción (`description`) | Dominio / Módulo | Nivel de Riesgo |
| :--- | :--- | :--- | :---: |
| **`store_user:read`** | Permite consultar el listado de empleados asignados a la tienda actual y su estado de actividad. | Usuarios / Tienda | 🟢 Bajo (Lectura local) |
| **`store_user:create`** | Permite crear nuevos empleados asociados directamente a la tienda actual con credenciales y rol. | Usuarios / Tienda | 🟡 Medio (Creación de cuentas) |
| **`store_user:update`** | Permite modificar datos, rol y reactivar el acceso de empleados en la tienda actual. | Usuarios / Tienda | 🟡 Medio (Modificación de accesos) |
| **`store_user:delete`** | Permite desactivar/revocar el acceso de un empleado a la tienda actual (sin eliminar el usuario global). | Usuarios / Tienda | 🔴 Alto (Suspensión de acceso) |
| **`store:access_all`** | Concede acceso global y automático a todas las tiendas de la compañía sin requerir asignación explícita. | Seguridad / Multi-Tenant | 🔴 Alto (Supervisores / Auditores) |

---

## 2. Permisos de Inventario y Carga Masiva

| Nombre del Permiso (`name`) | Descripción Sugerida (`description`) | Módulo / Dominio | Nivel de Riesgo |
| :--- | :--- | :--- | :---: |
| **`product:stock_entry`** | Permite realizar ingresos manuales de existencias al inventario de productos. | Inventario / Almacén | 🔴 Alto (Financiero / Físico) |
| **`product:import`** | Permite previsualizar y ejecutar la carga masiva de productos vía CSV con Upsert. | Inventario / Catálogo | 🔴 Alto (Afectación Masiva) |
| **`product:kardex_read`** | Permite consultar el historial de movimientos de inventario (Kardex) y costos de compra. | Inventario / Auditoría | 🟡 Medio (Privacidad de Costos) |

---

## 3. Catálogo de Permisos Estándar del Sistema

| Nombre del Permiso (`name`) | Descripción (`description`) | Módulo |
| :--- | :--- | :--- |
| **`user:read`** | Permite consultar usuarios a nivel de compañía. | Usuarios (Empresa) |
| **`user:create`** | Permite crear usuarios asignando tiendas y rol a nivel de compañía. | Usuarios (Empresa) |
| **`user:update`** | Permite actualizar información de usuarios de la compañía. | Usuarios (Empresa) |
| **`user:delete`** | Permite desactivar usuarios a nivel de compañía. | Usuarios (Empresa) |
| **`store:read`** | Permite consultar las tiendas de la compañía. | Tiendas |
| **`store:create`** | Permite registrar una nueva tienda física con su NIT y datos básicos. | Tiendas |
| **`store:update`** | Permite modificar datos básicos y estado de las tiendas. | Tiendas |
| **`store:delete`** | Permite desactivar una tienda de la compañía. | Tiendas |
| **`product:read`** | Permite consultar el catálogo y existencias de productos. | Productos |
| **`product:create`** | Permite registrar nuevos productos en el catálogo. | Productos |
| **`product:update`** | Permite modificar datos, precios y stock mínimo de productos. | Productos |
| **`product:delete`** | Permite dar de baja o eliminar productos del inventario. | Productos |
| **`sale:read`** | Permite consultar el historial de ventas y comprobantes emitidos. | Ventas |
| **`sale:create`** | Permite registrar y procesar ventas en el punto de venta (POS). | Ventas |
| **`customer:read`** | Permite buscar y consultar clientes. | Clientes |
| **`customer:create`** | Permite registrar clientes para facturación. | Clientes |
| **`report:read`** | Permite consultar y exportar reportes del sistema. | Reportes |

---

## 4. Sentencias SQL para Inserción Directa (PostgreSQL)

Ejecuta el siguiente bloque SQL en tu base de datos para registrar todos los permisos faltantes:

```sql
-- 1. Insertar nuevos permisos de empleados de tienda y acceso global
INSERT INTO sys.permissions (name, description, status, created_at, updated_at)
VALUES 
  ('store_user:read', 'Permite consultar empleados asociados a la tienda', 'ACTIVE', NOW(), NOW()),
  ('store_user:create', 'Permite crear cuentas de empleados asociadas a la tienda', 'ACTIVE', NOW(), NOW()),
  ('store_user:update', 'Permite editar información y reactivar empleados de la tienda', 'ACTIVE', NOW(), NOW()),
  ('store_user:delete', 'Permite revocar el acceso de empleados a la tienda', 'ACTIVE', NOW(), NOW()),
  ('store:access_all', 'Permite acceder a todas las tiendas de la compañía sin asignación explícita', 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, updated_at = NOW();

-- 2. Insertar permisos de inventario
INSERT INTO sys.permissions (name, description, status, created_at, updated_at)
VALUES 
  ('product:stock_entry', 'Permite realizar ingresos manuales de existencias al inventario de productos', 'ACTIVE', NOW(), NOW()),
  ('product:import', 'Permite previsualizar y ejecutar la carga masiva de productos vía CSV', 'ACTIVE', NOW(), NOW()),
  ('product:kardex_read', 'Permite consultar el historial de movimientos y auditoría de Kardex de productos', 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, updated_at = NOW();

-- 3. Asegurar la existencia de los permisos de catálogo, tiendas y ventas
INSERT INTO sys.permissions (name, description, status, created_at, updated_at)
VALUES 
  ('store:read', 'Permite consultar tiendas registradas', 'ACTIVE', NOW(), NOW()),
  ('store:create', 'Permite crear una nueva tienda con NIT y datos básicos', 'ACTIVE', NOW(), NOW()),
  ('store:update', 'Permite modificar la información de una tienda', 'ACTIVE', NOW(), NOW()),
  ('store:delete', 'Permite dar de baja una tienda', 'ACTIVE', NOW(), NOW()),
  ('product:read', 'Permite consultar el catálogo y existencias de productos', 'ACTIVE', NOW(), NOW()),
  ('product:create', 'Permite registrar nuevos productos en el catálogo', 'ACTIVE', NOW(), NOW()),
  ('product:update', 'Permite modificar datos, precios y stock mínimo de productos', 'ACTIVE', NOW(), NOW()),
  ('product:delete', 'Permite dar de baja o eliminar productos del inventario', 'ACTIVE', NOW(), NOW()),
  ('sale:read', 'Permite consultar el historial de ventas y comprobantes', 'ACTIVE', NOW(), NOW()),
  ('sale:create', 'Permite registrar ventas en el punto de venta POS', 'ACTIVE', NOW(), NOW()),
  ('report:read', 'Permite consultar y exportar reportes del sistema', 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

---

## 5. Asignación Automática a Roles Administradores

Para garantizar que los administradores de empresa o administradores de tienda dispongan de estos permisos de forma inmediata:

```sql
-- Asignar los nuevos permisos de empleados y acceso a roles administradores
INSERT INTO sys.role_permissions (role_id, permission_id, status, created_at, updated_at)
SELECT r.id, p.id, 'ACTIVE', NOW(), NOW()
FROM sys.roles r
CROSS JOIN sys.permissions p
WHERE (LOWER(r.name) LIKE '%admin%' OR LOWER(r.name) LIKE '%administrador%' OR LOWER(r.name) LIKE '%gerente%')
  AND p.name IN (
    'store_user:read', 
    'store_user:create', 
    'store_user:update', 
    'store_user:delete', 
    'store:access_all',
    'store:read',
    'store:create',
    'store:update',
    'store:delete'
  )
ON CONFLICT DO NOTHING;
```

---

## 6. Formatos JSON para Creación vía API (`POST /authorization/permissions/create`)

```json
[
  {
    "name": "store_user:read",
    "description": "Permite consultar empleados asociados a la tienda actual"
  },
  {
    "name": "store_user:create",
    "description": "Permite crear y registrar empleados asociados a la tienda"
  },
  {
    "name": "store_user:update",
    "description": "Permite editar datos y reactivar empleados de la tienda"
  },
  {
    "name": "store_user:delete",
    "description": "Permite revocar el acceso de empleados a la tienda"
  },
  {
    "name": "store:access_all",
    "description": "Permite acceso a todas las tiendas de la compañía sin asignación explícita"
  }
]
```
