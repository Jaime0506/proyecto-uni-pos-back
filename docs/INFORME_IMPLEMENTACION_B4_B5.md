# Informe de Implementación: Requerimientos B3, B4 y B5 (Módulo de Ingreso Seguro)

Este documento certifica y describe la solución técnica completada en los repositorios [proyecto-uni-pos-back](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back) y [proyecto-uni-pos-front](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front) para dar cumplimiento a los requerimientos funcionales **B3**, **B4** y **B5** del **Módulo de Ingreso Seguro** de la tesis.

> **Fecha de Actualización:** Octubre 2026  
> **Estado de la Suite:** Compilación limpia en ambos proyectos (`0 errores` con TypeScript + Vite + SWC).  
> **Nota de Configuración:** El cierre por inactividad (**B3**) se encuentra calibrado a **30 minutos** (con aviso preventivo en el último minuto) según las políticas de seguridad estándar del POS.

---

## 1. Tabla de Requerimientos y Estado de Cumplimiento

| Código | Requerimiento de Tesis | Estado Final | Observaciones de Implementación |
| :---: | :--- | :---: | :--- |
| **B3** | *"El sistema debe manejar sesiones seguras, incluyendo cierre automático por inactividad y mecanismos de protección frente a accesos no autorizados."* | ✅ **Completado** | • **Front:** Hook `useIdleTimer` (calibrado a 30 min con aviso preventivo) + modal interactivo `IdleTimeoutModal` + refresco transparente en `axiosConfig.ts`.<br>• **Back:** Validación de inactividad (`SESSION_IDLE_TIMEOUT_MINUTES=30`), kill-switch de usuarios inactivos/revocados en `jwt.strategy.ts` y auditoría en `sys.sessions`. |
| **B4** | *"El sistema debe permitir al cliente consultar su historial de compras a través de la interfaz web."* | ✅ **Completado** | Pestaña **"Mis Compras"** en `/bonos-cliente`, respaldada por endpoint público optimizado `GET /customer-portal/purchases`. |
| **B5** | *"El sistema debe mostrar al cliente el detalle de cada compra realizada, incluyendo productos adquiridos, fecha y monto total."* | ✅ **Completado** | Modal digital [PurchaseDetailModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/PurchaseDetailModal.tsx) con desglose de ítems, precio unitario, subtotal, bonos y total pagado. |

---

## 2. Cambios Realizados en el Backend (`proyecto-uni-pos-back`)

### A. Para el Requerimiento B3 (Inactividad y Accesos No Autorizados)

1. **Estrategia JWT y Kill-Switch ([jwt.strategy.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/strategies/jwt.strategy.ts)):**
   * **Protección contra accesos no autorizados:** Valida en cada petición si `session.user.isActive === false`. Si un administrador desactiva a un usuario, su sesión se revoca en base de datos (`revokedReason: 'user_deactivated'`) y se rechaza de inmediato con `401 Unauthorized`.
   * **Validación de Inactividad de Servidor:** Compara `lastSeenAt` (o `loginAt`) contra `SESSION_IDLE_TIMEOUT_MINUTES`. Si transcurrió más tiempo del límite sin actividad, revoca la sesión en `sys.sessions` (`revokedReason: 'inactivity_timeout'`) y retorna `UnauthorizedException('Sesión cerrada por inactividad')`.
   * **Registro de Actividad:** Actualiza `lastSeenAt = new Date()` en cada petición autorizada.

2. **Servicio de Autenticación ([auth.service.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/auth.service.ts)):**
   * **Refresh Token con Validación de Inactividad:** El método `refresh(refreshToken)` valida que la sesión no haya expirado por inactividad antes de emitir un nuevo `accessToken` y actualiza `lastSeenAt`.
   * **Revocación Global de Sesiones:** Método `revokeAllUserSessions(userId, reason)` para invalidar inmediatamente todas las sesiones abiertas de un usuario en caso de compromiso o despido.
   * **Auditoría de Cierre:** El método `logout(req, reason)` almacena en `sys.sessions.revoked_reason` el motivo del cierre (ej. `'logout'` o `'inactivity_timeout'`).

3. **Controlador y DTO ([auth.controller.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/auth.controller.ts) y [logout.dto.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/dto/logout.dto.ts)):**
   * Soporte en `POST /auth/logout` para recibir opcionalmente `{ reason: 'inactivity_timeout' }`.

---

### B. Para los Requerimientos B4 y B5 (Historial y Detalle de Compras)

1. **Servicio del Portal del Cliente ([customer-portal.service.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/customer-portal/customer-portal.service.ts)):**
   * Interfaces `CustomerPurchase` y `CustomerPurchaseItem`.
   * Método `getPurchases(customerId, companyId, storeId)`:
     * Consulta SQL vinculando `sys.sales`, `sys.sale_items` y `sys.products`.
     * Filtro multi-inquilino estricto (`customer_id`, `company_id`, `store_id`, `deleted_at IS NULL`).
     * Orden cronológico descendente (`ORDER BY created_at DESC`).
     * Resiliencia con `COALESCE(p.name, 'Producto no disponible')` ante productos retirados del catálogo.
     * Agrupación en memoria de ventas con sus arreglos de productos y cálculo de unidades.

2. **Controlador ([customer-portal.controller.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/customer-portal/customer-portal.controller.ts)):**
   * Endpoint público `GET /customer-portal/purchases` con validación `ParseIntPipe` y documentación OpenAPI/Swagger.

---

## 3. Cambios Realizados en el Frontend (`proyecto-uni-pos-front`)

### A. Para el Requerimiento B3 (Inactividad y Renovación de Token)

1. **Hook de Inactividad ([useIdleTimer.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/hooks/useIdleTimer.ts)):**
   * Monitorea eventos DOM (`mousedown`, `mousemove`, `keydown`, `scroll`, `touchstart`).
   * Aplica *throttling* de 1.5 segundos para no consumir CPU.
   * Dispara advertencia previa al cumplirse el umbral de aviso.
   * Dispara el callback `onIdle` al cumplirse el tiempo límite.

2. **Modal de Aviso Preventivo ([IdleTimeoutModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/auth/IdleTimeoutModal.tsx)):**
   * Diálogo modal interactivo con estética limpia y accesible.
   * Reloj animado y contador regresivo en segundos.
   * Botón para continuar sesión (resetea el temporizador) o cerrar sesión voluntariamente.

3. **Protección Global en Rutas Privadas ([PrivateRoutes.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/routes/PrivateRoutes.tsx)):**
   * Integración de `useIdleTimer` e `IdleTimeoutModal` en todas las pantallas del sistema POS autenticado.
   * **Calibración actual para pruebas:**
     * `timeoutMs: 1 * 60 * 1000` (1 minuto).
     * `warningThresholdMs: 20 * 1000` (Aviso durante los últimos 20 segundos).

4. **Cliente Axios Robusto ([axiosConfig.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/lib/axiosConfig.ts)):**
   * **Renovación Transparente de Token:** Si el `accessToken` expira mientras el usuario está trabajando activamente, el interceptor llama a `POST /auth/refresh` mediante una promesa compartida concurrente (`getRefreshedToken`), actualiza el token en `localStorage` y reintenta la petición sin desconectar al cajero.
   * **Detección de Inactividad o Revocación:** Si el backend responde que la sesión expiró por inactividad o que el usuario fue revocado, cancela cualquier intento de refresco, purga las credenciales y redirige a `/login?reason=inactivity` o `/login?reason=deactivated`.

5. **Notificación en Pantalla de Login ([LoginPage.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/auth/LoginPage.tsx)):**
   * Banner informativo en color ámbar o rojo indicando el motivo de cierre de sesión al redirigir al usuario.

---

### B. Para los Requerimientos B4 y B5 (Historial y Detalle de Compras)

1. **Cliente API y Hook ([customerPortal.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/services/customerPortal.ts) y [useCustomerPortal.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/hooks/useCustomerPortal.ts)):**
   * Tipado de compras y productos.
   * Carga simultánea con `Promise.all` al seleccionar la tienda en `/bonos-cliente`.

2. **Componente de Detalle ([PurchaseDetailModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/PurchaseDetailModal.tsx)):**
   * Ticket digital con datos de tienda, fecha/hora `es-CO`, número de venta `#ID`.
   * Desglose de productos con cantidades, precio unitario y total de línea.
   * Resumen financiero: Subtotal, descuentos/bonos aplicados y total pagado.

3. **Interfaz de Usuario ([CustomerPortalPage.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/CustomerPortalPage.tsx)):**
   * Pestaña **"Mis Compras"** con métricas de compras realizadas y total invertido.
   * Listado cronológico con estados y botón *"Ver detalle"*.

---

## 4. Guía Rápida para Probar las Funcionalidades

### A. Prueba del Cierre por Inactividad (B3 - Calibrado a 1 min)
1. Iniciar sesión con un usuario administrativo o cajero.
2. Ingresar a cualquier pantalla privada (ej. `/app/inicio`, ventas o inventario).
3. **No realizar ninguna acción** (no mover el ratón ni pulsar teclas).
4. **A los 40 segundos:** Aparecerá el modal de advertencia mostrando la cuenta regresiva: `20, 19, 18...`
5. **Si se pulsa "Continuar trabajando":** El modal se cierra y el tiempo se renueva por 1 minuto adicional.
6. **Si se deja llegar a 0:** El sistema cierra sesión automáticamente, limpia las credenciales y redirige a `/login?reason=inactivity`, mostrando el banner informativo.

### B. Prueba del Historial y Detalle de Compras (B4 y B5)
1. Navegar en el navegador a `/bonos-cliente`.
2. Ingresar el documento/cédula de un cliente con compras registradas.
3. Seleccionar la tienda.
4. En el panel principal, hacer clic en la pestaña **"Mis Compras"**:
   * Se observan las tarjetas resumen y el listado de ventas (**B4**).
   * Al hacer clic en **"Ver detalle"**, se despliega el ticket digital con el desglose de productos (**B5**).

---

## 5. Tabla de Calibración de Tiempos

| Parámetro | Valor Configurado | Archivo de Configuración |
| :--- | :---: | :--- |
| **Tiempo de Inactividad (Frontend)** | `30 minutos` (1.800.000 ms) | [PrivateRoutes.tsx:22](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/routes/PrivateRoutes.tsx#L22) |
| **Aviso Preventivo (Frontend)** | `60 segundos` (60.000 ms) | [PrivateRoutes.tsx:23](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/routes/PrivateRoutes.tsx#L23) |
| **Límite de Inactividad (Backend)** | `30 minutos` | [jwt.strategy.ts:65](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/strategies/jwt.strategy.ts#L65) / `.env` (`SESSION_IDLE_TIMEOUT_MINUTES`) |
| **Expiración de Token Acceso (TTL)** | `30 minutos` | `.env` (`JWT_ACCESS_TTL`) |
| **Expiración de Refresh Token (TTL)** | `7 días` | `.env` (`JWT_REFRESH_TTL`) |
