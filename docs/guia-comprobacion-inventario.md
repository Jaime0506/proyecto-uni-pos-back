# Guía de Ajustes y Comprobación - Módulo de Inventario

**Proyecto:** Sistema POS Multi-tenant (Tesis)  
**Fecha:** 4 de Octubre de 2026  
**Documento:** `docs/guia-comprobacion-inventario.md`

---

## 1. Resumen de Ajustes Implementados por Requerimiento

| Requerimiento Funcional | Ajuste Implementado en Backend | Ajuste Implementado en Frontend |
|---|---|---|
| **RF-01: Registrar Producto** | Soporte para `categoryId`, `minStock` (default 5), imagen opcional en [`create-product.dto.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/dto/create-product.dto.ts). Genera movimiento inicial de Kardex si stock inicial > 0. | [`CreateProductDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/products/CreateProductDialog.tsx) con selector de categorías dinámico, input de stock mínimo e imagen opcional con fallback. |
| **RF-02: Modificar Producto** | [`update-product.dto.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/dto/update-product.dto.ts) y [`products.service.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/products.service.ts) actualizan categoría, imagen, stock mínimo y registran movimiento de ajuste (`ADJUSTMENT`) si se cambia el stock. | [`ProductFormDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/products/ProductFormDialog.tsx) actualizado con selector de categoría, campo de imagen y stock mínimo. |
| **RF-03: Soft Delete e Histórico** | Snapshot inmutable `product_name` en [`sale-items.entity.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/sales/entities/sale-items.entity.ts). En [`sales.service.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/sales/sales.service.ts), `COALESCE(si.product_name, p.name)` garantiza que facturas y ventas nunca queden con nombre nulo. | [`DeleteProductDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/products/DeleteProductDialog.tsx) con mensaje explicativo de dar de baja sin afectar histórico. Selector de ventas excluye productos dados de baja. |
| **RF-04: Ingreso Manual de Stock** | Endpoint `POST /products/stock-entry/:id` en [`products.controller.ts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/products.controller.ts) con recálculo aditivo atómico y registro en Kardex (`MANUAL_ENTRY`). | Componente [`ManualStockEntryDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/products/ManualStockEntryDialog.tsx) y botón directo en cada tarjeta de producto. |
| **RF-05: Alerta de Stock Mínimo** | Columna `minStock` agregada a la entidad [`Product`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/entities/product.entity.ts). | Badges visuales en tiempo real en [`ProductsCardsGrid.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/products/ProductsCardsGrid.tsx): 🔴 Agotado (`stock = 0`), 🟠 Bajo Stock (`stock <= minStock`), 🟢 Disponible. |
| **RF-06: Buscador Multi-criterio** | Relación `category` precargada con `leftJoinAndSelect` en [`getAllProducts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/products.service.ts). | Barra de búsqueda en [`ProductsHeader.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/products/ProductsHeader.tsx) filtrando reactivamente por nombre, SKU, código de barras, categoría y estado de stock. Selector de ventas también ampliado. |
| **RF-07: Listado Actualizado** | Optimización de ordenación (`id DESC`) y relaciones en [`getAllProducts`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/products.service.ts). | Listado sincronizado en [`ProductsPage.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/store/products/ProductsPage.tsx) tras cada creación, edición, baja o ingreso de stock. |
| **RF-08: Kardex / Historial** | Entidad [`StockMovement`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/products/entities/stock-movement.entity.ts) y endpoint `GET /products/:id/movements`. Traza automática en ventas (`SALE`), ingresos (`MANUAL_ENTRY`), ajustes (`ADJUSTMENT`) y stock inicial (`INITIAL`). | Diálogo [`ProductMovementsDialog.tsx`](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/products/ProductMovementsDialog.tsx) con tabla cronológica interactiva. |

---

## 2. Checklist de Pruebas y Comprobaciones

Sigue estos pasos en el navegador para comprobar exhaustivamente que todo funciona de acuerdo a la especificación:

### Prueba 1: Creación de Producto Completo (RF-01, RF-05, RF-08)
1. Ingresa a la sección de **Productos** (`/store/products`).
2. Haz clic en **"Crear Producto"**.
3. Completa los campos:
   - Nombre: `Gaseosa Manzana 400ml`
   - Categoría: Selecciona una categoría existente.
   - SKU: `GAS-MANZ-400`
   - Código de barras: `7701234567890`
   - Precio de compra: `2000`
   - Precio de venta: `3000`
   - Stock Inicial: `10`
   - Stock Mínimo: `5`
4. Guarda el producto.
5. **Comprobación esperada:** 
   - El producto aparece inmediatamente al inicio de la lista con su insignia de categoría y badge verde de **"10 disponibles"**.
   - Haz clic en el ícono de reloj/historial (Kardex): debe existir un registro de tipo **Stock Inicial** con cantidad `+10`, previo `0`, resultante `10`.

---

### Prueba 2: Búsqueda Multi-criterio en Tiempo Real (RF-06)
1. En la barra de búsqueda de la cabecera:
   - Escribe el código de barras `7701234567890` -> El producto debe filtrarse al instante.
   - Limpia y escribe el SKU `GAS-MANZ` -> Debe filtrarse al instante.
   - Limpia y escribe el nombre `Manzana` -> Debe filtrarse al instante.
2. Selecciona la categoría en el dropdown -> Solo deben aparecer productos de dicha categoría.
3. Selecciona el filtro de stock -> Prueba cambiar entre "Todo el stock", "Bajo stock", "Agotados".

---

### Prueba 3: Ingreso Manual de Stock (RF-04, RF-08)
1. En la tarjeta del producto recién creado, haz clic en el ícono verde con el paquete y la flecha (`+` **Ingreso Manual de Stock**).
2. Se abrirá el diálogo **Ingreso Manual de Stock**:
   - Cantidad a ingresar: `5`
   - Motivo: `Compra a proveedor`
3. Haz clic en **"Confirmar Ingreso"**.
4. **Comprobación esperada:**
   - El stock del producto se actualiza inmediatamente a `15 unidades`.
   - Vuelve a abrir el Kardex del producto: debe aparecer un nuevo movimiento tipo **Ingreso Manual** (`+5`, previo `10`, resultante `15`, motivo: `Compra a proveedor`).

---

### Prueba 4: Alerta Visual de Stock Mínimo (RF-05)
1. Haz clic en **Editar** el producto (ícono de lápiz).
2. Modifica el Stock Total a `4` (que es menor que el stock mínimo configurado de `5`).
3. Guarda los cambios.
4. **Comprobación esperada:**
   - La tarjeta del producto se pinta con un borde y fondo ámbar suave.
   - El badge de stock cambia automáticamente a 🟠 **"Bajo Stock (4 unids)"**.
   - Si editas el stock a `0`, la tarjeta cambia a borde rojo y badge 🔴 **"Agotado (0 unids)"**.

---

### Prueba 5: Trazabilidad en Venta y Kardex Automático (RF-08, RF-03)
1. Dirígete al módulo de **Ventas** (`/store/sales`) y abre el diálogo de **Nueva Venta**.
2. En el buscador del selector de productos, busca por el código de barras o SKU del producto -> Debe aparecer disponible.
3. Agrega `2 unidades` y completa la venta con cualquier método de pago.
4. Regresa a **Productos**:
   - El stock debe haber disminuido en 2 unidades automáticamente.
   - Abre el Kardex: debe reflejarse el movimiento de tipo **Venta** con cantidad `-2`, y en motivo/referencia el número de la venta (ej. `Venta #12`).

---

### Prueba 6: Soft Delete y Comprobación de Facturación Histórica (RF-03)
1. En la tarjeta del producto, haz clic en el ícono de papelera (**Dar de baja**).
2. En el modal de confirmación, verifica el nuevo mensaje que aclara que se da de baja del catálogo activo pero que todo el histórico de ventas y facturas previas se mantendrá intacto.
3. Confirma la baja.
4. **Comprobación esperada:**
   - El producto **desaparece** del catálogo activo de inventario.
   - Ve a **Ventas**: en el selector de nueva venta, el producto **ya no aparece** para ser vendido.
   - En el listado de ventas históricas (`/store/sales`), la venta realizada en el Paso 5 **sigue mostrando el nombre del producto, cantidad y valor con total normalidad**.
   - Haz clic en **Ver Comprobante / Descargar PDF**: el recibo muestra el nombre del producto y todos sus valores de liquidación sin errores ni valores nulos.

---

## 3. Comandos de Validación Local

Para levantar o verificar el estado de los proyectos localmente:

### Backend
```bash
cd proyecto-uni-pos-back
pnpm run build
pnpm run start:dev
```

### Frontend
```bash
cd proyecto-uni-pos-front
pnpm run build
pnpm run dev
```
