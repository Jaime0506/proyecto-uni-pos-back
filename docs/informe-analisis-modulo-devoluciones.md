# Análisis del Módulo de Devoluciones (v2, con esquema propuesto)

Contraste entre el requerimiento, el código actual (`proyecto-uni-pos-back`, `proyecto-uni-pos-front`) y el esquema SQL propuesto (`sys.sale_returns` y `sys.sale_return_items`). **No se ha modificado ningún archivo de código.**

## 1. Resumen ejecutivo

> [!WARNING]
> En el código no existe nada de devoluciones: ni entidades, ni DTOs, ni servicios, ni permisos, ni pantallas. El esquema propuesto cubre bien el registro y la trazabilidad de **qué** se devolvió y **cuánto** se reembolsó. No cubre el flujo de **aprobación/rechazo**, las **políticas** ni el **estado visible para el cliente**.

| # | Requerimiento | Código actual | Esquema propuesto | Veredicto |
|---|---|---|---|---|
| 1 | Registrar solicitud ligada a una venta | No existe | `sale_id` + `sale_item_id` | Cubierto en datos. Falta el código |
| 2 | Validar políticas (plazos, estado, condiciones) | No existe | Sin campos | **No cubierto** |
| 3 | Aprobar o rechazar | No existe | Sin `status` ni revisor | **No cubierto** |
| 4 | Actualizar inventario al aprobar | Kardex reutilizable | `product_id`, `quantity`, `lot_id` | Parcial. Hay un problema con los lotes |
| 5 | PDF de comprobante | Hay plantilla de venta | Datos suficientes, falta numeración | Parcial |
| 6 | Cliente consulta estado | Portal sin devoluciones | Sin `status` ni `customer_id` | **No cubierto** |

## 2. Contraste del esquema con las estructuras existentes

### 2.1 Hallazgo crítico: los lotes (`product_lots`) no existen en el código

`sale_return_items.lot_id` tiene una FK a `sys.product_lots(id)`. Una búsqueda de `product_lots`, `lot_id`, `lotId` y `ProductLot` en backend, frontend y docs **no devuelve nada**.

- No hay entidad `ProductLot`. Si la tabla existe en tu base de datos, el código no la conoce.
- [`SaleItem`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/sales/entities/sale-items.entity.ts) **no guarda el lote** del que salió la mercancía. [`StockMovement`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/entities/stock-movement.entity.ts) tampoco.
- [`Product`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/entities/product.entity.ts) maneja un `stock` único en `int`. El `createSale` actual descuenta de ese total, sin lotes.
- Resultado: en una devolución no se puede saber a qué lote regresa la mercancía. Hoy `lot_id` quedaría siempre `NULL`.

**Opciones:**
1. Dejar `lot_id` nullable y sin usar (no se hace nada con lotes todavía). Es lo más simple.
2. Implementar lotes completos: entidad `ProductLot`, `lot_id` en `sale_items` y `stock_movements`, y descuento FIFO/FEFO en `createSale`. Es un cambio grande que afecta el módulo de ventas e inventario.
3. Quitar `lot_id` de este esquema hasta que existan los lotes.

### 2.2 FK a `sys.users(id)`

- No existe una entidad `User` en el código. Hay solo [`UserCompanyMembership`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/users/entities/user-company-membership.entity.ts) y se accede a `sys.users` con SQL directo.
- `Sale.user_id` ya es `uuid`, así que el tipo `user_id uuid` es consistente.
- La entidad `SaleReturn` debe mapear `user_id` como columna simple (`@Column('uuid')`), sin relación TypeORM.

### 2.3 Comparación de campos con `sales` y `stock_movements`

| Aspecto | `sales` / `sale_items` (existente) | `sale_returns` / `sale_return_items` (propuesto) | Observación |
|---|---|---|---|
| `company_id`, `store_id` | Sí | **No tiene** | Falta. Las consultas, los permisos y el stock están por tienda. Se obtienen con `JOIN sales` o se denormalizan en la tabla (recomendado) |
| `customer_id` | Sí | No tiene | Se puede obtener desde `sales`. El portal del cliente necesita filtrar por él |
| Estado | `status varchar(10)` | **No tiene** | Sin estado no hay solicitud pendiente, aprobada o rechazada |
| Revisor y fecha de revisión | No aplica | **No tiene** | Falta para aprobar o rechazar y para auditoría |
| Motivo de rechazo | No aplica | **No tiene** | |
| Método de reembolso | `payment_method` | No tiene | Falta (efectivo o bono) |
| Descuento por línea | `discount` | No tiene | Los descuentos y el bono no se prorratean |
| `vat_rate` | Sí | No tiene | Se puede derivar desde `sale_items`. `vat_amount` sí está |
| `product_name` | Sí (snapshot) | No tiene | El PDF necesita el nombre. Se obtiene con JOIN |
| `deleted_at` | Sí en `sales` | No tiene | No hace falta si las devoluciones no se borran |
| Cantidad pendiente por devolver | No existe | No existe | Se calcula con `SUM(sale_return_items.quantity)` por `sale_item_id` |
| `sale_item_id` | — | **`NULL` permitido** | Con `NULL` no se puede validar el tope contra lo vendido. Se recomienda `NOT NULL` |

### 2.4 Tipos y convenciones

- Los `numeric(18, 4)`, `int4` y `timestamptz` son consistentes con las entidades actuales.
- En el código actual, `sale_items` tiene columnas `numeric` que TypeORM devuelve como `string`. Hay que usar `Number(...)` al leer, como hace `customer-portal.service.ts`.
- Con `synchronize: true` ([typeorm.config.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/database/typeorm.config.ts)) y `entities: **/*.entity.ts`, al crear las entidades TypeORM **comparará las tablas ya creadas a mano con las entidades y las alterará** si hay diferencias (por ejemplo: `GENERATED BY DEFAULT AS IDENTITY` frente a `SERIAL`, nombres de FK y de constraints). Las entidades deben escribirse con mucho cuidado para que coincidan con el DDL, o se debe decidir un esquema de migraciones. Si no se hace, se pueden perder o recrear constraints.
- `@PrimaryGeneratedColumn('identity')` es lo que coincide con `GENERATED BY DEFAULT AS IDENTITY`. Las entidades actuales usan `@PrimaryGeneratedColumn()` (serial), así que el comportamiento no es idéntico.
- Falta un índice por `sale_id`, `sale_item_id` y `sale_return_id`. Postgres no los crea automáticamente en las FK.

## 3. Análisis por requerimiento

### 3.1 Registrar solicitud asociada a una venta

- **Datos:** `sale_returns.sale_id` y `sale_return_items.sale_item_id` cubren el vínculo. `reason` y `total_refund` están. `user_id` guarda quién la registra.
- **Código:** hay que crear entidades, DTO, servicio, controlador y módulo. `getAllSales` y `getPurchases` ya sirven para localizar la venta. `createSale` es el patrón de transacción (`processTransaction`).
- **Brechas:**
  - Falta el tope de devolución: `cantidad devuelta + ya devuelta ≤ cantidad vendida`.
  - `Sale.status` es `varchar(10)`: no caben `partially_returned` ni `fully_returned`. Alternativa: **no tocar la venta** y derivar su estado desde las devoluciones.
  - `total_refund` debe calcularse en el servidor, no confiar en el cliente. `createSale` hoy acepta totales del cliente (`line_total`, `total`) sin recalcular. No debe repetirse en devoluciones.

### 3.2 Validar políticas

- **Datos:** el esquema no tiene nada para esto. Tampoco existen en `Company` ni en `Product`.
- **Brechas:** falta definir el plazo (con `sales.created_at`), qué productos no se pueden devolver, el estado del producto y las condiciones. Hacen falta campos como `condition` en `sale_return_items` y una configuración de políticas por empresa o tienda (por ejemplo `return_window_days`).
- Sin esto el requerimiento 2 solo se puede cumplir con reglas fijas en código.

### 3.3 Aprobar o rechazar

- **Datos:** **No hay `status`, `reviewed_by`, `reviewed_at` ni `rejection_reason`.** Con el esquema actual toda devolución nace ya "ejecutada".
- **Dos flujos posibles:**
  - **A) Flujo simple:** la devolución la registra un usuario con permiso y se aplica en el mismo momento. No hay aprobación. No cumple el requerimiento 3.
  - **B) Flujo con aprobación (el requerido):** `pending → approved | rejected`. Se necesitan los campos anteriores y que el inventario cambie solo en la aprobación.
- **Permisos:** `sale:read` y `sale:create` son los únicos relacionados. Se necesitan `return:create`, `return:read`, `return:approve` (y opcionalmente `return:reject`), y asignarlos al rol de administrador y al de coordinador de tienda.
- **Auditoría:** el módulo `audit` (`AuditService.logAction`) puede registrar cada creación, aprobación o rechazo con `module: 'returns'`.

### 3.4 Actualizar inventario

- **Patrón existente:** `createSale` (líneas 380 a 400 de [sales.service.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/sales/sales.service.ts#L380-L400)) descuenta `Product.stock` y escribe un `StockMovement`. La devolución hace lo contrario con `quantity` positiva.
- **Brechas:**
  - `StockMovement.type` es una unión de TypeScript sin `'RETURN'`. La columna es `varchar(50)`, así que basta ampliar el tipo.
  - `stock_movements` no guarda la referencia de la devolución. Se puede usar `reason: 'Devolución #id'`, igual que `Venta #id`.
  - Los lotes: ver 2.1.
  - Productos devueltos dañados: no deberían volver al stock vendible. Hace falta definir el destino (merma o ajuste).
  - Condición de carrera: `createSale` lee y luego guarda el stock sin lock. En la aprobación hay que usar `UPDATE ... SET stock = stock + :q` o `pessimistic_write`.
  - Solo debe ocurrir en la aprobación (flujo B). Debe ser idempotente: no se debe poder aprobar dos veces.

### 3.5 PDF de comprobante

- **Frontend:** [saleReceiptPdf.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/utils/saleReceiptPdf.ts) usa `jspdf` y `jspdf-autotable`. Sirve de plantilla.
- **Datos disponibles:** `sale_returns` (id, fecha, motivo, total) e ítems (cantidad, precio, IVA, reembolso). Faltan nombre del producto (JOIN), cliente, tienda y aprobador (JOIN o nuevos campos).
- **Brecha:** el número de comprobante sería el `id` de `sale_returns`. Si se necesita un formato fiscal (por ejemplo `DEV-000123`), hay que generarlo.
- **Decisión:** el backend no tiene librería de PDF. Se puede mantener `jspdf` en el frontend como hoy.

### 3.6 Cliente consulta el estado

- **Datos:** no hay `status` ni `customer_id` en `sale_returns`. El cliente se obtiene por `JOIN sales`.
- **Código:** hay que agregar `GET customer-portal/returns` y una pestaña en `pages/customer-portal`.
- **Seguridad previa (sin cambios respecto al informe anterior):**
  > [!CAUTION]
  > Los endpoints del portal son públicos, reciben `customerId` por query y `verify-password` no emite token. Un endpoint de devoluciones con el mismo patrón expondría datos de cualquier cliente.

## 4. Cambios recomendados al esquema propuesto

```sql
-- sale_returns: campos adicionales sugeridos
ALTER TABLE sys.sale_returns
  ADD COLUMN company_id int4 NOT NULL,
  ADD COLUMN store_id int4 NOT NULL,
  ADD COLUMN customer_id int4 NULL,
  ADD COLUMN status varchar(20) NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  ADD COLUMN refund_method varchar(50) NULL,                  -- cash | bonus | ...
  ADD COLUMN reviewed_by uuid NULL,
  ADD COLUMN reviewed_at timestamptz NULL,
  ADD COLUMN rejection_reason text NULL,
  ADD COLUMN updated_at timestamptz DEFAULT now();

-- sale_return_items: campos adicionales sugeridos
ALTER TABLE sys.sale_return_items
  ALTER COLUMN sale_item_id SET NOT NULL,
  ADD COLUMN condition varchar(30) NULL,                      -- new | opened | damaged ...
  ADD COLUMN restock boolean NOT NULL DEFAULT true;

-- índices
CREATE INDEX sale_returns_sale_idx   ON sys.sale_returns(sale_id);
CREATE INDEX sale_returns_store_idx  ON sys.sale_returns(store_id, status);
CREATE INDEX sale_return_items_return_idx ON sys.sale_return_items(sale_return_id);
CREATE INDEX sale_return_items_item_idx   ON sys.sale_return_items(sale_item_id);
```

Este bloque es una sugerencia para discutir. No se ha ejecutado.

## 5. Plan de implementación actualizado (sin ejecutar)

1. **Decisiones previas** (sección 6).
2. **Base de datos:** cerrar el DDL final y decidir entre `synchronize` y migraciones.
3. **Backend:**
   - entidades `SaleReturn` y `SaleReturnItem` (alineadas al DDL);
   - módulo `returns`: crear, listar, detalle, aprobar, rechazar;
   - servicio de políticas;
   - aprobación transaccional: validar tope, sumar stock con `StockMovement` tipo `RETURN`, ajustar bonos si aplica y registrar auditoría;
   - ampliar el tipo de `StockMovement`;
   - permisos `return:*` y asignación a roles;
   - ajustar `reports` para descontar devoluciones aprobadas.
4. **Portal del cliente:** autenticación con token y endpoint `returns`.
5. **Frontend:** pantalla de devoluciones en tienda, pestaña en el portal, `returnReceiptPdf.ts` y servicio API.
6. **Pruebas:** tope de cantidades, doble aprobación, devolución parcial, permisos, stock y PDF.

## 6. Decisiones que necesito de ti

1. **Lotes:** ¿se implementan ahora (cambia ventas e inventario) o `lot_id` queda sin usar o se elimina?
2. **Flujo de aprobación:** ¿se agregan `status`, `reviewed_by`, `reviewed_at` y `rejection_reason` (flujo B)? Lo pide el requerimiento 3.
3. **¿Agregar `company_id`, `store_id` y `customer_id` a `sale_returns`?** Recomendado por rendimiento y permisos.
4. **¿`sale_item_id` pasa a `NOT NULL`?** Recomendado para validar el tope.
5. **Políticas:** plazo, productos excluidos y estados del producto.
6. **Reembolso:** efectivo, bono o ambos. Esto define el ajuste en `bonuses`.
7. **Productos dañados:** ¿vuelven al stock o se descartan (`restock`)?
8. **Migraciones:** ¿se mantiene `synchronize: true` o se pasa a migraciones?
9. **Portal:** ¿el cliente solo consulta, o también puede solicitar? ¿Se corrige antes la autenticación?
