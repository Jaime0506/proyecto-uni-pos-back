# Informe Técnico: Corrección y Validación de Campañas Vencidas e Inactivas en POS

> **Fecha:** 04 de Octubre de 2026  
> **Módulo:** Ventas POS & Fidelización / Campañas (`RewardRule`)  
> **Estado:** Implementado y Verificado (Builds Back y Front 100% exitosos)  
> **Regla de Versiones:** Cambios no confirmados (sin `git commit`), a la espera de confirmación del usuario.

---

## 1. Diagnóstico del Problema

### Síntoma Reportado
Al momento de registrar una venta en la caja registradora / POS (`CreateSaleDialog`), el sistema permitía visualizar y seleccionar campañas de bonificación que:
- Ya habían alcanzado o superado su fecha de finalización (`endsAt < now`).
- Aún no habían alcanzado su fecha de inicio programada (`startsAt > now`).
- Habían sido marcadas manualmente como inactivas (`isActive = false`).

### Causa Raíz Identificada

1. **Frontend (`useCampaignLogic.ts`):**
   - El hook encargado de calcular las campañas aplicables (`availableCampaigns`) únicamente filtraba por coincidencia de productos (`selectedProductIds.some(id => campaignProductIds.includes(id))`).
   - Omitía por completo verificar el estado de activación `isActive` y los rangos de vigencia temporal `startsAt` y `endsAt`.
   - Adicionalmente, el método `validateCampaign` no verificaba la vigencia, permitiendo aplicar campañas fuera de tiempo.
   - Si una campaña dejaba de ser válida, no se limpiaba el estado de selección automática en el carrito.

2. **Frontend (`CampaignSelector.tsx`):**
   - Las tarjetas de campaña no ofrecían retroalimentación visual sobre la fecha límite de vencimiento de la campaña, generando ambigüedad para el cajero.

3. **Backend (`sales.service.ts`):**
   - En el método transaccional `createSale`, el parámetro `createSaleDto.campaignId` se almacenaba directamente sin verificar en la base de datos si la regla de bonificación (`RewardRule`) continuaba activa, si sus fechas eran válidas o si pertenecía a la misma empresa y sucursal.

---

## 2. Solución Implementada

### A. Frontend (`proyecto-uni-pos-front`)

1. **Utilidad de Validación Temporal (`src/hooks/useCampaignLogic.ts`):**
   - Se introdujo la función `isCampaignActiveAndCurrent(campaign: RewardRuleType): boolean`:
     - Retorna `false` si `campaign.isActive !== true`.
     - Si existe `startsAt`, valida que `now >= startsAt`.
     - Si existe `endsAt`, valida que `now <= endsAt`.
   - Se actualizó el filtro reactivo `availableCampaigns` con `useMemo` para exigir que toda campaña ofertada cumpla estrictamente con `isCampaignActiveAndCurrent(campaign)` antes de cruzarla con los productos seleccionados.
   - Se añadió un efecto sincronizador (`useEffect`) que resetea `selectedCampaignId` a `null` si la campaña previamente seleccionada deja de cumplir las condiciones de vigencia o inventario.
   - En `validateCampaign(campaign)`, se incorporaron validaciones explícitas con mensajes claros en caso de intento de selección de campañas inactivas, no iniciadas o expiradas.

2. **Mejora en la Interfaz de Selección (`src/components/sales/CampaignSelector.tsx`):**
   - Se añadió un distintivo verde de **"Vigente"** en cada campaña disponible.
   - Se visualiza la fecha y hora exacta de vencimiento (`Vence: DD/MM/AAAA HH:mm`).
   - El mensaje cuando no hay campañas se actualizó a: *"No hay campañas vigentes para los productos seleccionados"*.

### B. Backend (`proyecto-uni-pos-back`)

1. **Registro de Entidad en Módulo (`src/modules/sales/sales.module.ts`):**
   - Se importó e inyectó `RewardRule` en `TypeOrmModule.forFeature([..., RewardRule])`.

2. **Validación Transaccional Estricta (`src/modules/sales/sales.service.ts`):**
   - Al inicio del flujo transaccional de `createSale`, si `createSaleDto.campaignId` viene informado:
     - Se consulta la regla en base de datos. Si no existe, lanza `BadRequestException`.
     - Si `isActive === false`, lanza `BadRequestException("La campaña ... se encuentra inactiva.")`.
     - Si `startsAt && now < startsAt`, lanza `BadRequestException("La campaña ... aún no ha comenzado.")`.
     - Si `endsAt && now > endsAt`, lanza `BadRequestException("La campaña ... ha finalizado y se encuentra vencida.")`.
     - Si `companyId` o `storeId` no coinciden con la venta, lanza `BadRequestException`.

---

## 3. Matriz de Estados de Campaña

| Estado | `isActive` | `startsAt` | `endsAt` | ¿Aparece en POS? | ¿Aceptada por Backend? |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Activa / Vigente** | `true` | Pasado / `null` | Futuro / `null` |  **SÍ** |  **SÍ** |
| **Inactiva** | `false` | Cualquier fecha | Cualquier fecha |  **NO** |  **NO** (Rechazo 400) |
| **Próximamente** | `true` | Futuro | Futuro |  **NO** |  **NO** (Rechazo 400) |
| **Vencida / Finalizada** | `true` | Pasado | Pasado |  **NO** |  **NO** (Rechazo 400) |
| **Otra Tienda/Empresa** | `true` | Vigente | Vigente |  **NO** |  **NO** (Rechazo 400) |

---

## 4. Archivos Modificados

| Proyecto | Archivo | Modificación Realizada |
| :--- | :--- | :--- |
| **Frontend** | `src/hooks/useCampaignLogic.ts` | Filtrado por `isActive` y fechas `startsAt`/`endsAt`, deselección automática y validación explícita. |
| **Frontend** | `src/components/sales/CampaignSelector.tsx` | Badge de vigencia y visualización legible de fecha de vencimiento. |
| **Backend** | `src/modules/sales/sales.module.ts` | Inclusión de `RewardRule` en los proveedores TypeORM de ventas. |
| **Backend** | `src/modules/sales/sales.service.ts` | Validación atómica y transaccional de vigencia y pertenencia de la campaña en `createSale`. |

---

## 5. Verificación de Compilación

- **Backend:** `pnpm run build` ejecutado exitosamente (`TSC: Found 0 issues`, `SWC: 137 files`).
- **Frontend:** `pnpm run build` ejecutado exitosamente (`tsc -b && vite build`, `0 errors`).
