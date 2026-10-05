-- =============================================================================
-- SCRIPT DE MIGRACIÓN: MÓDULO DE DEVOLUCIONES
-- Esquema: sys
-- =============================================================================

-- 1. TABLA: sys.return_policies (Políticas Comerciales de Devolución)
CREATE TABLE IF NOT EXISTS sys.return_policies (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    store_id INT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    max_days_allowed INT NOT NULL DEFAULT 7,
    allow_partial_returns BOOLEAN NOT NULL DEFAULT TRUE,
    requires_original_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    allow_opened_box BOOLEAN NOT NULL DEFAULT FALSE,
    require_approval BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_refund_methods VARCHAR(50) NOT NULL DEFAULT 'CASH,BONUS',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT return_policies_company_fkey FOREIGN KEY (company_id) REFERENCES sys.companies(id) ON DELETE CASCADE,
    CONSTRAINT return_policies_store_fkey FOREIGN KEY (store_id) REFERENCES sys.stores(id) ON DELETE CASCADE,
    CONSTRAINT chk_max_days_positive CHECK (max_days_allowed >= 1)
);

CREATE INDEX IF NOT EXISTS idx_return_policies_lookup ON sys.return_policies(company_id, store_id, is_active);

-- 2. TABLA: sys.sale_returns (Cabecera de Solicitud y Proceso de Devolución)
CREATE TABLE IF NOT EXISTS sys.sale_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) NOT NULL UNIQUE,
    sale_id INT NOT NULL,
    company_id INT NOT NULL,
    store_id INT NOT NULL,
    customer_id INT NULL,
    policy_id INT NULL,
    
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW', 
    channel VARCHAR(30) NOT NULL DEFAULT 'IN_STORE', 
    
    requested_by_user_id UUID NULL,
    reviewed_by_user_id UUID NULL,
    reviewed_at TIMESTAMPTZ NULL,
    
    reason_category VARCHAR(50) NOT NULL, 
    customer_notes TEXT NULL,
    review_notes TEXT NULL,
    rejection_reason TEXT NULL,
    
    subtotal_refund NUMERIC(18, 4) NOT NULL DEFAULT 0,
    tax_refund NUMERIC(18, 4) NOT NULL DEFAULT 0,
    discount_adjustment NUMERIC(18, 4) NOT NULL DEFAULT 0,
    total_refund NUMERIC(18, 4) NOT NULL DEFAULT 0,
    
    refund_method VARCHAR(20) NULL,
    refund_status VARCHAR(30) NOT NULL DEFAULT 'PENDING', 
    refund_reference VARCHAR(100) NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT sale_returns_sale_fkey FOREIGN KEY (sale_id) REFERENCES sys.sales(id) ON DELETE RESTRICT,
    CONSTRAINT sale_returns_company_fkey FOREIGN KEY (company_id) REFERENCES sys.companies(id) ON DELETE CASCADE,
    CONSTRAINT sale_returns_store_fkey FOREIGN KEY (store_id) REFERENCES sys.stores(id) ON DELETE RESTRICT,
    CONSTRAINT sale_returns_customer_fkey FOREIGN KEY (customer_id) REFERENCES sys.customers(id) ON DELETE SET NULL,
    CONSTRAINT sale_returns_policy_fkey FOREIGN KEY (policy_id) REFERENCES sys.return_policies(id) ON DELETE SET NULL,
    CONSTRAINT sale_returns_requested_by_fkey FOREIGN KEY (requested_by_user_id) REFERENCES sys.users(id) ON DELETE SET NULL,
    CONSTRAINT sale_returns_reviewed_by_fkey FOREIGN KEY (reviewed_by_user_id) REFERENCES sys.users(id) ON DELETE SET NULL,
    CONSTRAINT chk_sale_returns_refund_method CHECK (refund_method IS NULL OR refund_method IN ('CASH', 'BONUS'))
);

CREATE INDEX IF NOT EXISTS idx_sale_returns_sale_id ON sys.sale_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_store_status ON sys.sale_returns(store_id, status);
CREATE INDEX IF NOT EXISTS idx_sale_returns_customer ON sys.sale_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_created_at ON sys.sale_returns(created_at DESC);

-- 3. TABLA: sys.sale_return_items (Detalle Granular de Productos Devueltos)
CREATE TABLE IF NOT EXISTS sys.sale_return_items (
    id SERIAL PRIMARY KEY,
    sale_return_id INT NOT NULL,
    sale_item_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    quantity INT NOT NULL,
    unit_price NUMERIC(18, 4) NOT NULL,
    discount_unit NUMERIC(18, 4) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    line_subtotal NUMERIC(18, 4) NOT NULL,
    line_total_refund NUMERIC(18, 4) NOT NULL,
    
    item_condition VARCHAR(50) NOT NULL DEFAULT 'SEALED_NEW',
    item_reason VARCHAR(255) NULL,
    restock_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT sale_return_items_return_fkey FOREIGN KEY (sale_return_id) REFERENCES sys.sale_returns(id) ON DELETE CASCADE,
    CONSTRAINT sale_return_items_sale_item_fkey FOREIGN KEY (sale_item_id) REFERENCES sys.sale_items(id) ON DELETE RESTRICT,
    CONSTRAINT sale_return_items_product_fkey FOREIGN KEY (product_id) REFERENCES sys.products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_sale_return_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON sys.sale_return_items(sale_return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item ON sys.sale_return_items(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON sys.sale_return_items(product_id);

-- 4. INSERTAR PERMISOS EN sys.permissions
INSERT INTO sys.permissions (name, description, status, created_at, updated_at)
VALUES 
  ('return:read', 'Permite consultar solicitudes e historial de devoluciones', 'ACTIVE', NOW(), NOW()),
  ('return:create', 'Permite registrar solicitudes de devolución asociadas a ventas', 'ACTIVE', NOW(), NOW()),
  ('return:approve', 'Permite aprobar devoluciones, reintegrar inventario y liquidar reembolsos', 'ACTIVE', NOW(), NOW()),
  ('return:reject', 'Permite rechazar solicitudes de devolución con justificación formal', 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, updated_at = NOW();

-- 5. ASIGNAR PERMISOS A ROLES ADMINISTRADORES Y COORDINADORES
INSERT INTO sys.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM sys.roles r
CROSS JOIN sys.permissions p
WHERE p.name IN ('return:read', 'return:create', 'return:approve', 'return:reject')
  AND (LOWER(r.name) LIKE '%admin%' OR LOWER(r.name) LIKE '%coordinador%' OR LOWER(r.name) LIKE '%gerente%')
ON CONFLICT DO NOTHING;

-- Asignar lectura y creación al rol de cajero/vendedor
INSERT INTO sys.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM sys.roles r
CROSS JOIN sys.permissions p
WHERE p.name IN ('return:read', 'return:create')
  AND (LOWER(r.name) LIKE '%cajer%' OR LOWER(r.name) LIKE '%vendedor%')
ON CONFLICT DO NOTHING;

-- 6. POLÍTICA POR DEFECTO PARA EMPRESAS EXISTENTES (SI NO TIENEN)
INSERT INTO sys.return_policies (company_id, store_id, name, description, max_days_allowed, allow_partial_returns, requires_original_receipt, allow_opened_box, require_approval, allowed_refund_methods, is_active, created_at, updated_at)
SELECT c.id, NULL, 'Política Estándar (7 días)', 'Política de devoluciones estándar de 7 días con reembolso en efectivo o bono.', 7, TRUE, TRUE, FALSE, TRUE, 'CASH,BONUS', TRUE, NOW(), NOW()
FROM sys.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM sys.return_policies rp WHERE rp.company_id = c.id AND rp.store_id IS NULL
);
