# Guía y Listado de Permisos para Registro en Base de Datos

Este documento contiene el listado oficial de permisos requeridos por el sistema, con especial énfasis en los **3 nuevos permisos de inventario**, así como las sentencias SQL y formatos JSON para crearlos directamente o a través del panel administrativo.

---

## 1. Los 3 Nuevos Permisos de Inventario

| Nombre del Permiso (`name`) | Descripción Sugerida (`description`) | Módulo / Dominio | Nivel de Riesgo |
| :--- | :--- | :--- | :---: |
| **`product:stock_entry`** | Permite realizar ingresos manuales de existencias al inventario de productos. | Inventario / Almacén | 🔴 Alto (Financiero / Físico) |
| **`product:import`** | Permite previsualizar y ejecutar la carga masiva de productos vía CSV con Upsert. | Inventario / Catálogo | 🔴 Alto (Afectación Masiva) |
| **`product:kardex_read`** | Permite consultar el historial de movimientos de inventario (Kardex) y costos de compra. | Inventario / Auditoría | 🟡 Medio (Privacidad de Costos) |

---

## 2. Permisos Estándar del Módulo de Tienda (Verificar Existencia)

Para que los roles operativos funcionen adecuadamente con los endpoints blindados, asegúrate de que estos permisos también existan en la tabla `sys.permissions`:

| Nombre del Permiso (`name`) | Descripción (`description`) |
| :--- | :--- |
| **`product:read`** | Permite consultar el catálogo y existencias de productos disponibles. |
| **`product:create`** | Permite registrar nuevos productos en el catálogo de la tienda. |
| **`product:update`** | Permite modificar datos, precios y stock mínimo de productos existentes. |
| **`product:delete`** | Permite dar de baja o eliminar productos del inventario. |
| **`sale:read`** | Permite consultar el historial de ventas y comprobantes emitidos. |
| **`sale:create`** | Permite registrar y procesar ventas en el punto de venta (POS). |
| **`report:read`** | Permite consultar y exportar reportes de ventas, inventario y cierres de caja. |
| **`customer:read`** | Permite buscar y consultar clientes en la base de datos. |
| **`customer:create`** | Permite registrar nuevos clientes para facturación en la tienda. |

---

## 3. Sentencia SQL para Inserción Directa (PostgreSQL)

Puedes ejecutar el siguiente script en tu cliente de base de datos (pgAdmin, DBeaver o consola `psql`):

```sql
-- 1. Insertar los 3 nuevos permisos en sys.permissions (ignora si ya existen)
INSERT INTO sys.permissions (name, description, status, created_at, updated_at)
VALUES 
  ('product:stock_entry', 'Permite realizar ingresos manuales de existencias al inventario de productos', 'ACTIVE', NOW(), NOW()),
  ('product:import', 'Permite previsualizar y ejecutar la carga masiva de productos vía CSV', 'ACTIVE', NOW(), NOW()),
  ('product:kardex_read', 'Permite consultar el historial de movimientos y auditoría de Kardex de productos', 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, updated_at = NOW();

-- 2. Asegurar la existencia de los permisos de catálogo y ventas de tienda
INSERT INTO sys.permissions (name, description, status, created_at, updated_at)
VALUES 
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

## 4. Asignación Automática a Roles Administradores (Recomendado)

Para evitar bloqueos `403 Forbidden` a los administradores de tienda existentes, ejecuta la siguiente vinculación automática en `sys.role_permissions`:

```sql
-- Asignar los nuevos permisos a todos los roles que contengan 'admin' en su nombre
INSERT INTO sys.role_permissions (role_id, permission_id, status, created_at, updated_at)
SELECT r.id, p.id, 'ACTIVE', NOW(), NOW()
FROM sys.roles r
CROSS JOIN sys.permissions p
WHERE LOWER(r.name) LIKE '%admin%'
  AND p.name IN ('product:stock_entry', 'product:import', 'product:kardex_read', 'product:read', 'product:create', 'product:update', 'product:delete', 'sale:create', 'sale:read', 'report:read')
ON CONFLICT DO NOTHING;
```

---

## 5. Formato para Creación vía API / Frontend (`POST /authorization/permissions/create`)

Si prefieres crearlos desde la interfaz en `/admin/permissions` o mediante llamada HTTP:

### Permiso 1: Ingreso de Stock
```json
{
  "name": "product:stock_entry",
  "description": "Permite realizar ingresos manuales de existencias al inventario de productos"
}
```

### Permiso 2: Carga Masiva CSV
```json
{
  "name": "product:import",
  "description": "Permite previsualizar y ejecutar la carga masiva de productos vía CSV"
}
```

### Permiso 3: Historial Kardex
```json
{
  "name": "product:kardex_read",
  "description": "Permite consultar el historial de movimientos y auditoría de Kardex de productos"
}
```
