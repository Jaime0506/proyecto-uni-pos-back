# Resumen y Estado de Funcionalidades: Módulo de Ingreso Seguro (Tesis)

Este documento detalla el estado consolidado, la justificación de diseño y el cumplimiento formal de los requerimientos funcionales del **Módulo de Ingreso Seguro** (documento de tesis) frente a la implementación real en los repositorios [proyecto-uni-pos-back](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back) y [proyecto-uni-pos-front](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front).

> **Última Actualización:** Octubre 2026  
> **Estado General:** Todos los requerimientos del Módulo de Ingreso Seguro han sido implementados y probados (**B1, B3, B4 y B5 al 100%**). El requerimiento **B2** fue formalmente descartado y justificado mediante desacoplamiento arquitectónico entre usuarios internos y clientes externos.  
> **Compilación del Ecosistema:** Backend NestJS (`0 issues`) y Frontend React + Vite (`0 errors`).

---

## 1. Matriz de Requerimientos y Estado de Cumplimiento

| # | Requerimiento de la Tesis | ¿Implementado? | Enfoque y Solución Técnica en el Proyecto | Estado Final |
| :---: | :--- | :---: | :--- | :---: |
| **B1** | Inicio de sesión de **clientes** mediante usuario y contraseña | ✅ **Sí** | • **Primer Acceso:** Al ingresar cédula, el portal detecta ausencia de clave y exige crear/confirmar contraseña (mínimo 6 caracteres, hash `bcrypt`).<br>• **Accesos Recurrentes:** Solicita contraseña y valida contra hash seguro.<br>• **Olvido de Clave / Restablecimiento en Tienda:** El cajero/administrador restablece la contraseña desde `/clients` mediante `PATCH /customers/reset-password/:id`. En su próxima visita, el cliente vuelve a definir su clave. | **Completado (100%)** |
| **B2** | Rol `"cliente"` dentro del esquema de permisos RBAC | 🚫 **Descartado / Excluido** | **Decisión Arquitectónica Justificada:** El RBAC (`sys.roles`, `sys.permissions`) administra privilegios del personal operativo y directivo (Cajeros, Admins). Los clientes residen en `sys.customers` y operan en un portal de autoservicio desacoplado sin permisos administrativos, previniendo escalamiento de privilegios y sobrecarga en el motor RBAC. | **Descartado (Justificado)** |
| **B3** | Cierre automático de sesión por **inactividad** (Idle timeout) y protección frente a accesos no autorizados | ✅ **Sí** | • **Frontend:** Hook `useIdleTimer` (calibrado a 1 min para pruebas con aviso a los 40s; 15 min en producción), modal `IdleTimeoutModal` y refresco concurrente transparente en `axiosConfig.ts`.<br>• **Backend:** Validación de inactividad (`SESSION_IDLE_TIMEOUT_MINUTES`), kill-switch de usuarios inactivos o revocados en `jwt.strategy.ts` y auditoría en `sys.sessions`. | **Completado (100%)** |
| **B4** | Consulta del **historial de compras** por parte del cliente en la web | ✅ **Sí** | Pestaña **"Mis Compras"** en `/bonos-cliente`, respaldada por endpoint público optimizado `GET /customer-portal/purchases` con validación de multi-inquilino. | **Completado (100%)** |
| **B5** | Detalle de cada compra para el cliente (**productos adquiridos**, fecha, total) | ✅ **Sí** | Modal digital [PurchaseDetailModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/PurchaseDetailModal.tsx) con desglose de productos, cantidades, precio unitario, bonos aplicados y valor total pagado. | **Completado (100%)** |

---

## 2. Detalle de Implementación por Requerimiento

### Requisito B1: Inicio de Sesión de Clientes con Contraseña y Restablecimiento en Tienda

* **Texto del Requisito en la Tesis:**
  > *"El sistema debe permitir el inicio de sesión de administradores, empleados y clientes mediante credenciales válidas (usuario y contraseña)."*

* **Flujo Operativo Implementado:**
  1. **Primer Acceso (Onboarding Seguro):**
     * El cliente ingresa su cédula en `/bonos-cliente` y selecciona la sede.
     * El backend retorna `hasPassword: false`.
     * La interfaz bloquea la visualización del saldo/historial y presenta el paso obligatorio **"Crea tu Contraseña"** (mínimo 6 caracteres, campo de confirmación y selector de visibilidad).
     * El endpoint `POST /customer-portal/set-password` cifra la contraseña con `bcrypt` (10 rounds) y la guarda en `sys.customers.password`.
  2. **Acceso Recurrente (Autenticación):**
     * Si `hasPassword: true`, el portal solicita la contraseña registrada.
     * El endpoint `POST /customer-portal/verify-password` valida contra el hash `bcrypt`.
     * Solo tras validación exitosa el frontend invoca la carga de bonos y compras (`loadDashboardData`).
  3. **Olvido de Clave y Restablecimiento en Tienda:**
     * Si el cliente olvida su clave, el portal le indica acercarse a la caja de la tienda.
     * En la pantalla de administración de clientes ([CustomersPage.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/store/customers/CustomersPage.tsx)), el personal autorizado (`customer:update`) cuenta con el botón de llave (*KeyRound*).
     * Al confirmar en el diálogo [ResetCustomerPasswordDialog.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/customers/ResetCustomerPasswordDialog.tsx), se invoca `PATCH /customers/reset-password/:id`, restableciendo `customer.password = null`.
     * En la siguiente consulta del cliente, el sistema detecta de nuevo `hasPassword: false`, solicitándole crear una nueva clave de acceso personal.

---

### Requisito B2: Rol y Permisos de "Cliente" en el Modelo RBAC (Descartado y Justificado)

* **Texto del Requisito en la Tesis:**
  > *"El sistema debe diferenciar los permisos de acceso de acuerdo con el rol del usuario (administrador, empleado o cliente)."*

* **Justificación de Descarte y Defensa en Tesis:**
  * **Separación de Dominios y Principio de Menor Privilegio:** Los clientes son actores externos de autoservicio que no ejecutan transacciones de caja, aperturas de turno, ventas ni modificaciones de inventario. Integrarlos dentro de la tabla de empleados `sys.users` y del RBAC operativo aumentaría innecesariamente la superficie de ataque del sistema POS.
  * **Seguridad Multi-Inquilino:** El cliente queda confinado estrictamente al dominio de consulta en `sys.customers` y al controlador `CustomerPortalController`, evitando cualquier riesgo de escalamiento de privilegios hacia el panel interno del POS.

---

### Requisito B3: Cierre Automático por Inactividad y Protección contra Accesos No Autorizados

* **Texto del Requisito en la Tesis:**
  > *"El sistema debe manejar sesiones seguras, incluyendo cierre automático por inactividad y mecanismos de protección frente a accesos no autorizados."*

* **Implementación:**
  1. **Kill-Switch Inmediato (Usuarios Desactivados o Comprometidos):**
     * En [jwt.strategy.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/strategies/jwt.strategy.ts), en cada petición HTTP autenticada se verifica `session.user.isActive`.
     * Si un administrador desactiva a un cajero o se revoca su sesión, el servidor rechaza inmediatamente la petición con `401 Unauthorized` y marca `revokedReason: 'user_deactivated'` en base de datos.
  2. **Detección y Cierre por Inactividad (Frontend & Backend):**
     * **Frontend:** Hook [useIdleTimer.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/hooks/useIdleTimer.ts) escucha eventos del mouse y teclado con *throttling*. Despliega el modal interactivo [IdleTimeoutModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/auth/IdleTimeoutModal.tsx) con cuenta regresiva. Si el tiempo expira, cierra la sesión, notifica al backend y redirige a `/login?reason=inactivity`.
     * **Backend:** Compara `lastSeenAt` con el límite permitido (`SESSION_IDLE_TIMEOUT_MINUTES`). Si vence la ventana sin peticiones, revoca la sesión y retorna `401`.
  3. **Renovación Transparente de Token (Usuario Activo):**
     * Interceptor en [axiosConfig.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/lib/axiosConfig.ts) refresca automáticamente el `accessToken` mediante el `refreshToken` sin interrumpir las operaciones del cajero activo.

---

### Requerimientos B4 y B5: Historial de Compras y Detalle de Productos Adquiridos

* **Texto de los Requisitos en la Tesis:**
  * **B4:** *"El sistema debe permitir al cliente consultar su historial de compras a través de la interfaz web."*
  * **B5:** *"El sistema debe mostrar al cliente el detalle de cada compra realizada, incluyendo productos adquiridos, fecha y monto total."*

* **Implementación:**
  * **Backend:** Endpoint `GET /customer-portal/purchases` en [customer-portal.controller.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/customer-portal/customer-portal.controller.ts) respaldado por `getPurchases()` con cruce relacional entre `sys.sales`, `sys.sale_items` y `sys.products`.
  * **Frontend:** Pestaña **"Mis Compras"** en `/bonos-cliente` con métricas consolidadas, listado cronológico de compras y el modal digital [PurchaseDetailModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/PurchaseDetailModal.tsx), el cual desglosa los artículos adquiridos, cantidades, precio unitario, bonos canjeados y monto total en formato de ticket digital formal.

---

## 3. Resumen de Archivos Creados y Modificados

### Backend (`proyecto-uni-pos-back`)
* `src/modules/customers/entities/customer.entity.ts`: Columna `password` (`varchar(255)`, `nullable: true`, `select: false`).
* `src/modules/customer-portal/dto/set-customer-password.dto.ts` y `verify-customer-password.dto.ts`: DTOs de validación con `class-validator`.
* `src/modules/customer-portal/customer-portal.service.ts`: Métodos `setPassword`, `verifyPassword`, y retorno de `hasPassword` en `lookupCustomer`.
* `src/modules/customer-portal/customer-portal.controller.ts`: Rutas `POST /customer-portal/set-password` y `POST /customer-portal/verify-password`.
* `src/modules/customers/customers.service.ts`: Método `resetPassword(id)` (asigna `password = null`).
* `src/modules/customers/customers.controller.ts`: Endpoint `PATCH /customers/reset-password/:id` con protección `@RequirePermissions(['customer:update'])`.
* `src/modules/auth/strategies/jwt.strategy.ts` y `auth.service.ts`: Validación de inactividad, revocación inmediata y actualización de `lastSeenAt`.

### Frontend (`proyecto-uni-pos-front`)
* `src/services/customerPortal.ts`: Métodos `setPassword` y `verifyPassword`.
* `src/services/customer.ts`: Método `resetPassword`.
* `src/hooks/useCustomers.ts`: Exposición del método `resetPassword` con notificaciones toast.
* `src/hooks/useCustomerPortal.ts`: Gestión del estado de verificación de contraseña y diferimiento de carga de datos hasta la autenticación.
* `src/pages/customer-portal/CustomerPortalPage.tsx`: Integración del paso `CustomerAuthStep` (creación y login con contraseña).
* `src/components/customers/ResetCustomerPasswordDialog.tsx`: Diálogo modal de confirmación para restablecer la contraseña del cliente.
* `src/components/customers/CustomersTable.tsx`: Botón con icono de llave para restablecer contraseña en la tabla de clientes.
* `src/pages/store/customers/CustomersPage.tsx`: Conexión del modal y ejecución de `resetPassword`.
* `src/hooks/useIdleTimer.ts` e `src/components/auth/IdleTimeoutModal.tsx`: Control de inactividad y modal de advertencia preventiva.
* `src/lib/axiosConfig.ts`: Manejo de renovación concurrente y expulsión por inactividad/desactivación.
* `src/pages/customer-portal/PurchaseDetailModal.tsx`: Ticket digital con detalle de productos adquiridos.
