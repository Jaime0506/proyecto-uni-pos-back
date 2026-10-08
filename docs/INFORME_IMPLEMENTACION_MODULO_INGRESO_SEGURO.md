# Informe de Implementación: Módulo de Ingreso Seguro (Requerimientos B1, B3, B4 y B5)

Este documento certifica, describe y documenta la arquitectura técnica implementada en los repositorios [proyecto-uni-pos-back](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back) y [proyecto-uni-pos-front](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front) para dar cumplimiento formal y operativo a los requerimientos del **Módulo de Ingreso Seguro** de la tesis.

> **Fecha de Actualización:** Octubre 2026  
> **Estado de la Suite:** Compilación limpia en ambos proyectos (`0 errores` con TypeScript + Vite + SWC).  
> **Calibración Temporal de Pruebas:** El cierre por inactividad (**B3**) se encuentra temporalmente configurado a **1 minuto** (con aviso a los 40s) en el frontend para agilizar pruebas y demostraciones en vivo.

---

## 1. Tabla de Requerimientos y Estado de Cumplimiento

| Código | Requerimiento de la Tesis | Estado Final | Resumen de la Solución Técnica Implementada |
| :---: | :--- | :---: | :--- |
| **B1** | *"El sistema debe permitir el inicio de sesión de administradores, empleados y clientes mediante credenciales válidas (usuario y contraseña)."* | ✅ **Completado (100%)** | • **Primer Acceso:** Creación y confirmación obligatoria de contraseña (mínimo 6 caracteres, hash `bcrypt` de 10 rondas).<br>• **Accesos Recurrentes:** Validación criptográfica de contraseña en `/bonos-cliente`.<br>• **Restablecimiento en Tienda:** Botón en tabla `/clients` con diálogo de confirmación que restablece `password = null`, requiriendo al cliente crear una nueva clave en su siguiente ingreso. |
| **B2** | *"El sistema debe diferenciar los permisos de acceso de acuerdo con el rol del usuario (administrador, empleado o cliente)."* | 🚫 **Descartado (Justificado)** | **Decisión Arquitectónica:** Separación de dominios entre usuarios internos con acceso al POS (`sys.users`, `sys.roles`, `sys.permissions`) y clientes externos de autoservicio (`sys.customers`). Protege la integridad del RBAC evitando otorgar acceso a tablas operativas a actores externos. |
| **B3** | *"El sistema debe manejar sesiones seguras, incluyendo cierre automático por inactividad y mecanismos de protección frente a accesos no autorizados."* | ✅ **Completado (100%)** | • **Frontend:** Hook `useIdleTimer` + modal `IdleTimeoutModal` + refresco transparente en `axiosConfig.ts`.<br>• **Backend:** Validación de inactividad (`SESSION_IDLE_TIMEOUT_MINUTES`), kill-switch de usuarios inactivos o revocados en `jwt.strategy.ts` y auditoría en `sys.sessions`. |
| **B4** | *"El sistema debe permitir al cliente consultar su historial de compras a través de la interfaz web."* | ✅ **Completado (100%)** | Pestaña **"Mis Compras"** en `/bonos-cliente`, respaldada por endpoint público optimizado `GET /customer-portal/purchases` con validación multi-inquilino. |
| **B5** | *"El sistema debe mostrar al cliente el detalle de cada compra realizada, incluyendo productos adquiridos, fecha y monto total."* | ✅ **Completado (100%)** | Modal digital [PurchaseDetailModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/PurchaseDetailModal.tsx) con desglose de productos adquiridos, cantidades, valor unitario, bonos aplicados y monto total pagado en COP. |

---

## 2. Arquitectura Detallada de Cada Solución

### A. Requerimiento B1: Autenticación y Gestión de Contraseñas del Cliente

```
[Cliente en /bonos-cliente] 
          │ (1) Ingresa Cédula
          ▼
   GET /lookup ───► hasPassword: false? ───► [Paso: Crea tu Contraseña (bcrypt hash)]
          │                                                    │
          │ hasPassword: true?                                 ▼
          ▼                                            POST /set-password
   [Paso: Ingresa Contraseña]                                  │
          │                                                    ▼
          ▼ POST /verify-password                  [Acceso al Dashboard: Bonos y Compras]
          │
          └──► ¿Olvidó su contraseña?
                     │
                     ▼
         [Visita Tienda Física / Caja]
                     │
         [Cajero/Admin en /clients]
                     │
         [Clic en botón 'Restablecer Contraseña' (Icono Llave)]
                     │
                     ▼
         PATCH /customers/reset-password/:id  (password = null)
                     │
                     ▼
         [En su siguiente visita, el portal le solicita crear una nueva clave]
```

1. **Modelo de Datos en Backend:**
   * Entidad [Customer](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/customers/entities/customer.entity.ts): Columna `password` (`varchar(255)`, `nullable: true`, `select: false`) para garantizar que los hashes de contraseñas nunca sean expuestos en consultas habituales.
2. **Endpoints en Backend:**
   * `POST /customer-portal/set-password`: Recibe `{ customerId, companyId, storeId, password }`. Cifra la clave con `bcrypt.hash(password, 10)` y la almacena.
   * `POST /customer-portal/verify-password`: Valida la contraseña mediante `bcrypt.compare`.
   * `PATCH /customers/reset-password/:id`: Endpoint protegido con `@RequirePermissions(['customer:update'])` que asigna `customer.password = null`.
3. **Flujo en Frontend:**
   * Paso intermedio `CustomerAuthStep` en [CustomerPortalPage.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/CustomerPortalPage.tsx) entre la selección de tienda y el dashboard.
   * La carga de datos sensibles (bonos y compras) no se efectúa hasta que el cliente supere exitosamente la autenticación.
   * Diálogo modal [ResetCustomerPasswordDialog.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/customers/ResetCustomerPasswordDialog.tsx) integrado en la tabla de clientes ([CustomersTable.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/customers/CustomersTable.tsx)).

---

### B. Requerimiento B3: Inactividad y Protección contra Accesos No Autorizados

1. **Kill-Switch y Protección Inmediata:**
   * En [jwt.strategy.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/auth/strategies/jwt.strategy.ts), en cada petición se evalúa:
     * Si `session.user.isActive === false`: Se revoca la sesión en base de datos (`revokedReason: 'user_deactivated'`) y se responde `401 Unauthorized`.
     * Si la diferencia entre la hora actual y `session.lastSeenAt` excede `SESSION_IDLE_TIMEOUT_MINUTES`: Se revoca la sesión (`revokedReason: 'inactivity_timeout'`) y se responde `401 Unauthorized`.
2. **Temporizador de Inactividad en Frontend:**
   * [useIdleTimer.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/hooks/useIdleTimer.ts) registra la interacción del usuario (`mousemove`, `keydown`, `click`, etc.) aplicando *throttling*.
   * Al faltar 20 segundos para el vencimiento (o 60 segundos en producción), se despliega el modal interactivo [IdleTimeoutModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/components/auth/IdleTimeoutModal.tsx).
   * Si el usuario continúa, el temporizador se reinicia. Si expira, se destruye la sesión y se redirige a `/login?reason=inactivity`.
3. **Renovación Transparente de Token (Usuario Activo):**
   * El cliente [axiosConfig.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/lib/axiosConfig.ts) refresca automáticamente el `accessToken` mediante el `refreshToken` en caso de que expire mientras el cajero realiza operaciones continuas.

---

### C. Requerimientos B4 y B5: Historial y Detalle de Compras del Cliente

1. **Historial de Compras (B4):**
   * Endpoint `GET /customer-portal/purchases` en [customer-portal.controller.ts](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-back/src/modules/customer-portal/customer-portal.controller.ts).
   * Consulta SQL con filtro estricto por `customer_id`, `company_id`, `store_id` y orden descendente por fecha.
   * Pestaña **"Mis Compras"** en [CustomerPortalPage.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/CustomerPortalPage.tsx) mostrando el volumen total de transacciones y monto total acumulado.
2. **Detalle de Productos Adquiridos (B5):**
   * Enlace relacional con `sys.sale_items` y `sys.products`.
   * Manejo con `COALESCE(p.name, 'Producto no disponible')` ante artículos descontinuados.
   * Modal [PurchaseDetailModal.tsx](file:///Users/jaimem/Dev/code/tesis/proyecto-uni-pos-front/src/pages/customer-portal/PurchaseDetailModal.tsx) estructurado como ticket de venta comercial con subtotales, bonos redimidos y total pagado.

---

## 3. Guía Paso a Paso para Pruebas en Vivo

### Prueba 1: Flujo Completo de Contraseña del Cliente (B1)
1. Abrir el navegador en `/bonos-cliente`.
2. Ingresar la cédula de un cliente (ej. `1234567890`) y seleccionar la tienda.
3. **Si es la primera vez que ingresa:**
   * Aparecerá la pantalla **"Crea tu Contraseña"**.
   * Intentar ingresar una clave menor a 6 caracteres o claves que no coincidan para verificar las validaciones del formulario.
   * Ingresar una contraseña válida (ej. `clave123`) y confirmar.
   * El sistema almacena la clave encriptada y accede inmediatamente al panel de bonos y compras.
4. **Si el cliente vuelve a ingresar posteriormente:**
   * Al seleccionar la tienda, el sistema presentará la pantalla **"Ingresa tu Contraseña"**.
   * Ingresar una clave incorrecta: El sistema mostrará *"Contraseña incorrecta"*.
   * Ingresar la clave correcta: El sistema abrirá el dashboard.
5. **Si el cliente olvidó la contraseña:**
   * En el mensaje inferior se indica acudir a la tienda.
   * Iniciar sesión en el POS como administrador o cajero y dirigirse a `/clients` (Clientes).
   * En la fila del cliente, hacer clic en el botón de la **llave ámbar** (*Restablecer contraseña del portal*).
   * Confirmar la acción en el diálogo.
   * Volver a `/bonos-cliente` con la cédula del cliente: el portal solicitará nuevamente **"Crea tu Contraseña"**, permitiendo al cliente definir una nueva clave.

### Prueba 2: Cierre Automático por Inactividad (B3 - Calibrado a 1 min)
1. Iniciar sesión en el POS como empleado o administrador.
2. Navegar a cualquier sección interna (ej. `/app/inicio` o inventario).
3. Dejar de interactuar con el mouse y el teclado.
4. **A los 40 segundos:** Se desplegará el modal interactivo con el contador regresivo de 20 segundos.
5. Si se deja correr el contador a 0, la sesión se cerrará de forma automática y el sistema redirigirá a `/login?reason=inactivity`, mostrando el banner de aviso.

### Prueba 3: Historial y Detalle de Compras (B4 y B5)
1. En `/bonos-cliente`, ingresar credenciales y acceder al panel del cliente.
2. Hacer clic en la pestaña **"Mis Compras"**:
   * Se observan las métricas y la lista de compras del cliente (**B4**).
3. Hacer clic en el botón **"Ver detalle"** de cualquier compra:
   * Se abre el modal con el ticket digital detallando los productos comprados, cantidades, precios unitarios y total pagado (**B5**).
