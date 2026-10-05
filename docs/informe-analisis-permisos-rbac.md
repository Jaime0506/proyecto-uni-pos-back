# Informe de Análisis: Arquitectura de Permisos RBAC y Nuevas Funcionalidades

**Fecha de análisis:** Octubre 2026  
**Proyecto:** Tesis POS (Backend NestJS + Frontend React)  
**Autor:** Antigravity Agent  
**Estado:** Propuesta y Análisis Técnico (Sin cambios aplicados en código)

---

## 1. Introducción y Contexto

A medida que el sistema POS ha ido incorporando funcionalidades avanzadas en los módulos de **Inventario**, **Ventas**, **Kardex**, **Carga Masiva CSV**, **Reportes** y **Fidelización**, se ha identificado la necesidad de evaluar el esquema de control de acceso basado en roles (RBAC - *Role-Based Access Control*).

El sistema cuenta con un motor de autorización granular implementado mediante:
- Entidad `sys.permissions` y tabla intermedia `sys.role_permissions`.
- Guardián en backend `PermissionGuard` con soporte de reglas `allOf`, `anyOf` y comodines (`product:*`, `*`).
- Hook frontend `hasPermission(permissionRequired, userPermissions)` para condicionar la interfaz visual.

El objetivo de este informe es determinar **si realmente se deben crear permisos nuevos, cuáles existentes deben reactivarse o formalizarse, y por qué sí o por qué no**, evitando la trampa de la "hiper-granularidad" que entorpece la administración cotidiana del sistema sin aportar seguridad real.

---

## 2. Diagnóstico del Estado Actual de Permisos

Al contrastar la base de código con el modelo de seguridad, se descubrió una **disparidad estructural crítica**:

### A. Panel de Administración Central (`Admin`)
- **Comportamiento:** Muy estricto y granular.
- **Implementación:** Todos los controladores (`stores`, `users`, `roles`, `categories`, `suppliers`, `permissions`, `companies`) tienen activos sus decoradores `@RequirePermissions([...])`.
- **Frontend:** La interfaz valida rigurosamente `hasPermission` antes de renderizar botones de creación, edición y eliminación.

### B. Módulos Operativos de Tienda (`Store / POS`)
- **Comportamiento:** Abiertos a cualquier usuario autenticado.
- **Implementación en Backend:**
  - `products.controller.ts`: El decorador `// @RequirePermissions(['products:read'])` se encuentra **comentado**. Los endpoints de creación, actualización, eliminación (soft-delete), ingreso manual de stock, consulta de movimientos (Kardex) y carga masiva CSV **no tienen ninguna restricción de permisos declarada**. Cualquier usuario con token JWT válido puede consumirlos.
  - `sales.controller.ts`: No declara `@RequirePermissions` en ningún endpoint.
  - `reports.controller.ts`: No declara `@RequirePermissions` en ningún endpoint.
  - `bonifications.controller.ts`: Decoradores `@RequirePermissions` comentados.
  - `rewards.controller.ts`: Decoradores `@RequirePermissions` comentados.
- **Implementación en Frontend:**
  - `menuItemsStore.tsx` únicamente restringe el acceso al menú principal (ej. `product:read` para ver la página `/products` o `sale:read` para `/sales`).
  - **Dentro de la página de Productos (`ProductsPage.tsx`):** Un usuario que solo tenga permiso de lectura (`product:read`) tiene acceso en pantalla a todos los botones: *Crear Producto*, *Editar Producto*, *Dar de Baja*, *Ingreso de Stock* y *Cargar CSV*.

---

## 3. Análisis por Ajustes y Funcionalidades Recientes

A continuación se evalúa cada funcionalidad reciente, analizando si amerita un permiso nuevo o la reutilización de uno existente:

### 3.1. Carga Masiva de Productos vía CSV (`POST /products/preview-upload` y `/uploadProductsByFile`)
* **¿Debe crearse un permiso nuevo?** **SÍ: `product:import` (o `product:bulk_upload`).**
* **¿Por qué SÍ?**
  - La carga masiva es una operación de alto impacto que altera el inventario de manera masiva, crea decenas de productos y actualiza precios de costo y venta mediante *Upsert*.
  - Si se reutilizara simplemente `product:update` o `product:create`, cualquier usuario con permiso para corregir el nombre de un artículo podría cargar un archivo CSV y modificar todo el catálogo de la tienda.
  - Esta acción debe reservarse exclusivamente a roles administrativos o supervisores de tienda.

### 3.2. Ingreso Manual de Stock (`POST /products/stock-entry/:id`)
* **¿Debe crearse un permiso nuevo?** **SÍ: `product:stock_entry` (o `inventory:adjust`).**
* **¿Por qué SÍ?**
  - El ingreso manual de existencias sin orden de compra formal es una operación altamente sensible ante fraudes, mermas ficticias o descuadres de inventario.
  - Un cajero o vendedor requiere consultar productos y venderlos, pero bajo ninguna circunstancia debería poder incrementar las existencias a discreción.
  - Separarlo de `product:update` permite que un usuario de inventario o cajero pueda editar datos no críticos (código de barras, categoría) sin tener la potestad de inflar el stock físico.

### 3.3. Histórico de Movimientos de Stock / Kardex (`GET /products/:id/movements`)
* **¿Debe crearse un permiso nuevo?** **SÍ (Recomendado): `product:kardex_read` (o `inventory:kardex`).**
* **¿Por qué SÍ?**
  - El Kardex revela auditoría interna: quién hizo qué movimiento (`userId`), la fecha exacta, los motivos de ajuste y los precios de compra históricos.
  - En la operación diaria, los cajeros necesitan ver el stock actual (`product:read`), pero los márgenes de ganancia, costos del proveedor y trazabilidad de auditoría son de interés gerencial o de supervisión.
  - *Alternativa de menor fricción:* Si no se desea mayor granularidad, podría exigirse `report:read` o `product:update`. Sin embargo, un permiso dedicado `product:kardex_read` es la mejor práctica contable.

### 3.4. Eliminación Lógica de Productos / Soft Delete (`DELETE /products/delete/:id`)
* **¿Debe crearse un permiso nuevo?** **NO.**
* **¿Por qué NO?**
  - Ya existe en la convención estándar del sistema el permiso **`product:delete`**.
  - Lo que se requiere no es crear un permiso nuevo, sino **activar y exigir `product:delete`** tanto en el controlador de NestJS como en la UI del frontend para ocultar el botón de papelera si el usuario no tiene dicha facultad.

### 3.5. Creación y Edición Estándar de Productos (`POST /create`, `PATCH /update`)
* **¿Debe crearse un permiso nuevo?** **NO.**
* **¿Por qué NO?**
  - Ya existen en el diseño los permisos **`product:create`** y **`product:update`**.
  - La solución consiste en aplicar `@RequirePermissions(['product:create'])` y `@RequirePermissions(['product:update'])` en `products.controller.ts` y condicionar los modales en el frontend.

### 3.6. Alertas Visuales de Stock Mínimo (`minStock`)
* **¿Debe crearse un permiso nuevo?** **NO.**
* **¿Por qué NO?**
  - El stock mínimo es un atributo del producto. Ver la alerta visual ("Agotado", "Bajo Stock") es inherente a la lectura del producto (`product:read`).
  - Configurar el umbral de alerta es parte de la edición del producto (`product:update`).

### 3.7. Módulo de Ventas (`sales.controller.ts`)
* **¿Debe crearse un permiso nuevo?** **NO.**
* **¿Por qué NO?**
  - Actualmente los endpoints de ventas carecen de decoradores. Deben aplicarse los permisos estándar:
    - `POST /sales/create`: Exigir **`sale:create`**.
    - `POST /sales/get-all`: Exigir **`sale:read`**.
    - `GET /sales/customers/search`: Exigir `customer:read` o `sale:create`.
  - La generación de recibos PDF e IVA V3 forma parte natural de la emisión y consulta de la venta; no requiere sub-permisos adicionales.

### 3.8. Módulo de Reportes (`reports.controller.ts`)
* **¿Debe crearse un permiso nuevo?** **OPCIONAL: `report:export`.**
* **Análisis:**
  - Para visualizar reportes en pantalla basta con **`report:read`**.
  - Si la empresa desea restringir la fuga de información masiva (descargar la base completa de ventas o clientes a Excel/CSV), se puede crear **`report:export`**. Si no se requiere esa restricción empresarial, `report:read` es suficiente para ambas cosas.

### 3.9. Portal del Cliente (Historial de Compras y Consultas)
* **¿Debe crearse un permiso nuevo?** **NO.**
* **¿Por qué NO?**
  - El portal de clientes está orientado a consumidores finales que ingresan con su documento de identidad y un código de verificación.
  - Los clientes no son usuarios del sistema administrativo (`sys.users`) ni pertenecen a roles de empleados. Vincular permisos RBAC a este portal rompería su arquitectura desacoplada.

---

## 4. Matriz Comparativa de Decisiones

A continuación se resume la propuesta para cada funcionalidad:

| Funcionalidad / Endpoint | Estado Actual | Permiso Propuesto | ¿Es Nuevo? | Justificación Principal |
| :--- | :--- | :--- | :---: | :--- |
| **Consultar Catálogo de Productos** (`POST /products/get-all`) | Abierto (comentado) | `product:read` | ❌ Existente | Necesario para cajeros y personal de tienda. |
| **Crear Producto** (`POST /products/create`) | Abierto (sin guard) | `product:create` | ❌ Existente | Solo personal de inventario/administración. |
| **Editar Producto** (`PATCH /products/update`) | Abierto (sin guard) | `product:update` | ❌ Existente | Modificación de precios y datos maestros. |
| **Dar de Baja Producto** (`DELETE /products/delete/:id`) | Abierto (sin guard) | `product:delete` | ❌ Existente | Acción destructiva irreversible por cajero. |
| **Carga Masiva CSV y Preview** (`POST /preview-upload`, `/uploadProductsByFile`) | Abierto (sin guard) | `product:import` | ✅ **NUEVO** | **Crítico:** Puede sobreescribir masivamente existencias y precios por SKU. |
| **Ingreso Manual de Stock** (`POST /products/stock-entry/:id`) | Abierto (sin guard) | `product:stock_entry` | ✅ **NUEVO** | **Crítico:** Modifica directamente unidades físicas; previene fraudes de inventario. |
| **Historial Kardex de Producto** (`GET /products/:id/movements`) | Abierto (sin guard) | `product:kardex_read` | ✅ **NUEVO** | **Recomendado:** Muestra costos de compra del proveedor y auditoría de usuarios. |
| **Registrar Venta POS** (`POST /sales/create`) | Abierto (sin guard) | `sale:create` | ❌ Existente | Esencia operativa del cajero. |
| **Consultar Historial de Ventas** (`POST /sales/get-all`) | Abierto (sin guard) | `sale:read` | ❌ Existente | Consulta de ventas pasadas y comprobantes. |
| **Consultar Reportes** (`GET /reports/*`) | Abierto (sin guard) | `report:read` | ❌ Existente | Métricas de ventas, inventario y cierres. |
| **Exportar Reportes a CSV** (`GET /reports/*/export`) | Abierto (sin guard) | `report:export` | 💡 *Opcional* | Control de fuga de bases de datos. |

---

## 5. El Riesgo de la "Hiper-Granularidad" y Cómo Mitigarlo

El usuario señaló acertadamente que el sistema ya tenía un nivel de detalle bastante granular. Si se crean permisos microscópicos para cada botón o modal, surgen los siguientes problemas:

1. **Fatiga de Configuración:** Un administrador que crea el rol "Cajero" tendría que marcar 35 casillas diferentes. Si olvida una sola casilla (ej. un sub-permiso de búsqueda de clientes), la interfaz falla con un error `403 Forbidden`.
2. **Desincronización en Base de Datos:** Los roles ya creados en las tiendas no tendrían los nuevos IDs de permisos asignados en `sys.role_permissions`, provocando que empleados en producción pierdan acceso de forma inesperada.

### Estrategia de Mitigación Recomendada:
Para evitar la hiper-granularidad, **únicamente se justifica crear 2 o máximo 3 permisos nuevos**:
1. `product:stock_entry`: Porque ingresar existencias es dinero en efectivo en forma de mercancía.
2. `product:import`: Porque un archivo CSV puede alterar miles de registros en 1 segundo.
3. *(Opcional)* `product:kardex_read`: Para separar la visibilidad de costos vs precios de venta.

El resto de operaciones debe cubrirse **activando los permisos estándar que ya existen** (`product:create`, `product:update`, `product:delete`, `sale:create`, `sale:read`, `report:read`).

---

## 6. Perfiles y Roles Tipo Sugeridos para Tiendas

Con este esquema equilibrado, la configuración de roles en tienda se simplifica drásticamente:

### Rol 1: Cajero / Vendedor (`CASHIER`)
* `product:read` (Buscar productos y consultar precios)
* `sale:create` (Registrar ventas en caja)
* `sale:read` (Reimprimir comprobantes)
* `customer:read` y `customer:create` (Registrar clientes para facturación)
* ❌ *Sin permisos de eliminación, edición de catálogo, ingreso de stock ni carga masiva CSV.*

### Rol 2: Encargado de Bodega / Almacenista (`STOCK_KEEPER`)
* `product:read`
* `product:stock_entry` (Ingresar mercancía recibida)
* `product:kardex_read` (Auditar movimientos de inventario)
* `supplier:read` (Consultar proveedores)
* ❌ *Sin permisos de venta ni de creación/eliminación de roles o usuarios.*

### Rol 3: Administrador de Tienda (`STORE_ADMIN`)
* Todos los permisos del Cajero y Almacenista.
* `product:create`, `product:update`, `product:delete`.
* `product:import` (Carga masiva CSV).
* `report:read` (Ver métricas financieras).
* `user:read`, `user:create`, `user:update`.

---

## 7. Plan de Acción Recomendado (Para Ejecución Futura)

Cuando se decida aplicar estos ajustes, el procedimiento seguro debe ser el siguiente:

1. **Fase 1: Semillas y Base de Datos (Sin romper producción)**
   - Crear un script SQL que inserte en `sys.permissions` los permisos faltantes (`product:stock_entry`, `product:import`, `product:kardex_read`, `product:create`, `product:update`, `product:delete`, `sale:create`, etc.).
   - Asignar automáticamente estos permisos al rol `ADMIN` y `STORE_ADMIN` existentes en cada tienda.

2. **Fase 2: Backend (Blindaje de Endpoints)**
   - Descomentar y agregar `@RequirePermissions` en `products.controller.ts`, `sales.controller.ts`, `reports.controller.ts`, `bonifications.controller.ts` y `rewards.controller.ts`.

3. **Fase 3: Frontend (Control de Componentes Visuales)**
   - En `ProductsPage.tsx`, `ProductsCardsGrid.tsx` y `ProductsHeader.tsx`:
     - Ocultar botón *"Cargar Productos"* si no tiene `product:import`.
     - Ocultar botón *"Crear Producto"* si no tiene `product:create`.
     - Ocultar botón *"Ingreso de Stock"* si no tiene `product:stock_entry`.
     - Ocultar botón *"Movimientos / Kardex"* si no tiene `product:kardex_read` (o `product:read`).
     - Ocultar opciones *"Editar"* o *"Dar de Baja"* en el menú de tarjeta si no cuenta con `product:update` o `product:delete`.

---

## 8. Conclusión

- **¿Debemos crear permisos nuevos?**  
  **Sí, pero de forma selectiva y justificada.** Específicamente **`product:stock_entry`** e **`product:import`**, ya que son operaciones críticas que no deben diluirse en un simple permiso de edición.
- **¿Qué es lo más urgente antes de crear docenas de permisos?**  
  **Activar los permisos que ya existen en el diseño.** El mayor riesgo de seguridad actual no es la falta de nuevos permisos, sino que los endpoints operativos de tienda (`products`, `sales`, `reports`) están completamente desprotegidos a nivel de permisos específicos en el backend y frontend.
