# Resumen de Implementación: Carga Masiva de Productos vía CSV con Previsualización y Upsert

Este documento detalla las funcionalidades implementadas en el backend (`proyecto-uni-pos-back`) y frontend (`proyecto-uni-pos-front`) para la carga masiva de productos mediante archivo CSV, cumpliendo con los 4 requerimientos solicitados.

---

## 1. Requerimientos Abordados y Solución Implementada

### Requerimiento 1: Stock Mínimo de Alerta en CSV (Opcional)
- **Backend:** 
  - La función `parseAndValidateCsvRows` analiza columnas con nombres: `stock_minimo`, `min_stock`, `stockMinimo` o `minStock`.
  - Si viene vacío o no está presente:
    - En productos nuevos: Se asigna el valor por defecto de 5 unidades.
    - En productos existentes: Conserva el valor actual de `minStock` registrado en base de datos.
  - Si viene informado, se valida que sea un entero $\ge 0$.
- **Frontend:**
  - Se actualizó el archivo de plantilla descargable `public/estructure-upload/productos.csv` agregando la columna `stock_minimo`.
  - Se actualizó la tabla explicativa en el paso 1 de `UploadProductsDialog.tsx`.

### Requerimiento 2: Actualización por SKU Existente (Upsert)
- **Backend:**
  - En lugar de insertar productos ciegamente con `save()`, ahora se consulta la existencia de productos por `sku` en lote (`In(validSkus)`) dentro de la misma tienda (`storeId`) y empresa (`companyId`).
  - Si el SKU ya existe:
    - Se actualizan los datos del producto: `name`, `purchasePrice`, `salePrice`, `stock`, `minStock`, `category`, `barcode`, `image`, y `updatedAt`.
    - No se crea ningún registro duplicado.
  - Si el SKU no existe o es nulo:
    - Se crea un nuevo producto en la tienda.

### Requerimiento 3: Registro en el Histórico de Movimientos (Kardex Completo)
- **Backend:**
  - Toda la operación se ejecuta dentro de una transacción ACID (`this.productRepository.manager.transaction`).
  - **Para productos nuevos:** Se genera un `StockMovement` de tipo `INITIAL` con la cantidad ingresada, `previousStock: 0`, `newStock: stock` y una razón descriptiva: `Carga inicial masiva CSV (SKU: ..., P. Compra: ..., P. Venta: ..., Stock Mín: ...)`.
  - **Para productos actualizados:**
    - Se calcula la diferencia de stock: `stockDiff = nuevoStock - anteriorStock`.
    - Si `stockDiff !== 0`:
      - `type = stockDiff > 0 ? 'MANUAL_ENTRY' : 'ADJUSTMENT'`.
      - `quantity = Math.abs(stockDiff)`.
    - Si el stock no varió pero cambiaron precios u otros datos:
      - `type = 'ADJUSTMENT'`, `quantity = 0`.
    - En el campo `reason` se registra una auditoría detallada de todos los cambios: variación de stock (`Stock: 10 ➔ 25 (+15)`), variaciones de precio venta (`P. Venta: $10.000 ➔ $12.000`), precio compra (`P. Compra: $7.000 ➔ $8.500`) y stock mínimo.
    - Se asocia el `userId` obtenido del token JWT.

### Requerimiento 4: Menú Detallado de Previsualización (Dry-Run / Diff)
- **Backend:**
  - Se implementó el endpoint `POST /products/preview-upload` que parsea y valida el CSV sin alterar la base de datos.
  - Retorna un resumen estadístico (`totalRows`, `toCreateCount`, `toUpdateCount`, `errorCount`, `unchangedCount`), la lista de nuevos productos (`toCreate`), la lista de productos a actualizar con valores anteriores y nuevos (`toUpdate`), y los errores encontrados (`errors`).
- **Frontend:**
  - `UploadProductsDialog.tsx` se transformó en un flujo de dos pasos:
    1. **Paso 1 (Carga y Validación):** Drag & drop o explorador de archivos, descarga de plantilla y botón *"Analizar y Previsualizar Cambios"*.
    2. **Paso 2 (Menú Detallado de Previsualización):**
       - 4 Tarjetas de resumen en la parte superior: Total de Filas, Nuevos Productos (verde), A Actualizar por SKU (azul) y Errores (rojo).
       - Alerta crítica si el archivo contiene errores (bloquea la confirmación para evitar corrupción de datos).
       - Filtros por pestañas: *Todos*, *Nuevos*, *A Actualizar* y *Errores*.
       - Buscador en tiempo real por SKU o Nombre de producto dentro del archivo analizado.
       - Tabla interactiva con badges y comparativas visuales:
         - Comparación de stock con deltas de incremento/decremento (`10 ➔ 25 (+15)`).
         - Comparación de precios con tachado del valor anterior (`$10.000 ➔ $12.000`).
         - Comparación de stock mínimo de alerta.
         - Badges descriptivos de cada cambio detectado.
       - Botón *"Volver y cambiar archivo"* y botón *"Confirmar y Aplicar Carga Masiva"*.

---

## 2. Archivos Modificados

### Backend (`proyecto-uni-pos-back`)
1. `src/modules/products/products.controller.ts`:
   - Endpoint `@Post('preview-upload')` con interceptor de archivo.
   - Endpoint `@Post('uploadProductsByFile')` enriquecido con inyección de `@Req() req` para capturar `userId`.
2. `src/modules/products/products.service.ts`:
   - `detectCSVSeparator`: detección automática de `;` y `,`.
   - `parseAndValidateCsvRows`: validación exhaustiva de campos requeridos, tipos numéricos positivos y detección de SKUs duplicados dentro del archivo.
   - `previewUpload`: análisis en memoria y cotejo contra base de datos.
   - `uploadProducts`: ejecución transaccional completa con Upsert por SKU y registro en Kardex (`StockMovement`).

### Frontend (`proyecto-uni-pos-front`)
1. `src/types/Products.ts`:
   - Nuevas interfaces: `CsvPreviewItemToCreate`, `CsvPreviewItemToUpdate`, `CsvPreviewError`, `CsvPreviewResponse`.
2. `public/estructure-upload/productos.csv`:
   - Incorporación de la columna `stock_minimo`.
3. `src/services/products.ts`:
   - Método `previewUploadProducts(companyId, storeId, file)`.
4. `src/hooks/useProducts.ts`:
   - Método `previewUploadProducts` expuesto en el objeto `methods`.
5. `src/pages/store/products/ProductsPage.tsx`:
   - Integración de `handlePreviewUploadProducts` y paso de prop `onPreview` a `UploadProductsDialog`.
6. `src/components/products/UploadProductsDialog.tsx`:
   - Rediseño completo del modal en wizard de dos pasos con diff interactivo, filtros, buscador y tarjetas de resumen.

---

## 3. Guía de Comprobación y Prueba Manual

### Prueba 1: Descargar Plantilla y Cargar Nuevos Productos
1. Abrir el modal de carga masiva en el módulo de Inventario (`/store/products`).
2. Descargar la plantilla CSV. Verificar que incluya la cabecera `stock_minimo`.
3. Rellenar una fila con un SKU nuevo (ej. `PRUEBA-01`), `stock: 20`, `stock_minimo: 8`.
4. Seleccionar el archivo y presionar **"Analizar y Previsualizar Cambios"**.
5. Verificar que aparezca en la tarjeta verde de **Nuevos Productos** y en la tabla como `[Nuevo]`.
6. Confirmar la carga y verificar en el listado de productos y en su modal de **Movimientos (Kardex)** que exista el movimiento `INITIAL`.

### Prueba 2: Actualizar Producto Existente por SKU (Upsert)
1. En el mismo CSV, mantener el SKU `PRUEBA-01`.
2. Modificar el precio de venta (ej. subir $2.000) y modificar el stock a `35` (un incremento de +15).
3. Analizar el archivo en el modal.
4. Verificar que aparezca en la tarjeta azul de **A Actualizar (SKU)**.
5. Observar en la tabla que el stock muestra: `20 ➔ 35 (+15)` y los precios reflejan el cambio con el valor previo tachado.
6. Confirmar la carga masiva y consultar el historial de movimientos de `PRUEBA-01`: debe registrarse un movimiento `MANUAL_ENTRY` con la razón detallada de la variación de stock y precios.

### Prueba 3: Manejo de Errores y Validaciones
1. Subir un archivo con un precio negativo o un SKU duplicado en dos filas del mismo archivo.
2. Presionar **"Analizar y Previsualizar Cambios"**.
3. Verificar que aparezca la tarjeta roja de **Errores de Validación**, la alerta descriptiva y que el botón de confirmación se encuentre **deshabilitado**.
