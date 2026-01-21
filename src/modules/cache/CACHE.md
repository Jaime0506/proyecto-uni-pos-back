# Sistema de Cache Inteligente

Sistema de caching basado en Redis con decoradores a nivel de endpoint para NestJS. Permite cachear respuestas de manera inteligente con keys dinámicas basadas en parámetros del request, con TTL con variación y soporte para invalidación por patrones.

## Características

- ✅ Cache automático con un decorator
- ✅ Keys dinámicas basadas en params, query, body y headers
- ✅ TTL con variación de ±10% para evitar thundering herd
- ✅ Invalidation por keys específicas o patrones (wildcards)
- ✅ Soporte para cache por usuario
- ✅ Fallback automático si Redis falla
- ✅ Logging de cache hits/misses
- ✅ Non-blocking para el flujo de la petición

## Arquitectura

```
src/modules/cache/
├── cache.module.ts                    # Módulo global de cache
├── cache.service.ts                   # Servicio central de cache
├── cache.guard.ts                     # Guard que maneja caching de respuestas
├── cache-invalidate.interceptor.ts     # Interceptor para invalidación
├── interfaces/
│   └── cache-options.interface.ts     # Interfaces para configuración
├── decorators/
│   ├── cache.decorator.ts            # Decorador @Cache()
│   └── cache-invalidate.decorator.ts # Decorador @CacheInvalidate()
└── utils/
    └── key-generator.util.ts         # Generador de keys dinámicas
```

## Instalación y Configuración

El módulo ya está configurado como global en `app.module.ts`, por lo que está disponible en toda la aplicación.

### Dependencias Requeridas

- `@nestjs-modules/ioredis`: Cliente de Redis para NestJS
- `ioredis`: Cliente de Redis

### Variables de Entorno

```bash
REDIS_URL=redis://localhost:6379
```

## Uso Básico

### Decorador @Cache()

El decorador `@Cache()` permite cachear automáticamente las respuestas de los endpoints.

```typescript
import { Cache } from 'src/modules/cache/decorators/cache.decorator';

@Post('get-all')
@Cache({ key: 'products', ttl: '5M' })
async getAllProducts(@Body() dto: GetAllProductsDto) {
  return await this.productsService.getAllProducts(dto);
}
```

### Decorador @CacheInvalidate()

El decorador `@CacheInvalidate()` permite invalidar caché después de operaciones de escritura.

```typescript
import { CacheInvalidate } from 'src/modules/cache/decorators/cache-invalidate.decorator';

@Patch('update/:id')
@CacheInvalidate({ patterns: ['products:*'] })
async updateProduct(@Param('id') id: number, @Body() dto: UpdateProductDto) {
  return await this.productsService.update(id, dto);
}
```

## Opciones de Configuración

### CacheOptions

```typescript
interface CacheOptions {
	key: string; // Obligatorio: Nombre base de la key
	ttl: string; // Obligatorio: TTL en formato '1S', '5M', '1H', '5D'
	params?: string[]; // Opcional: Parámetros de ruta a incluir
	query?: string[]; // Opcional: Query params a incluir
	body?: string[]; // Opcional: Campos del body a incluir
	headers?: string[]; // Opcional: Headers a incluir
	userId?: boolean; // Opcional: Incluir userId del JWT
	userFields?: string[]; // Opcional: Campos específicos del usuario a incluir
	condition?: (req: Request) => boolean; // Opcional: Condición para cachear
}
```

### CacheInvalidateOptions

```typescript
interface CacheInvalidateOptions {
	keys?: string[]; // Opcional: Keys específicas a invalidar
	patterns?: string[]; // Opcional: Patrones con wildcards
	params?: string[]; // Opcional: Invalidar basado en req.params
	query?: string[]; // Opcional: Invalidar basado en req.query
	body?: string[]; // Opcional: Invalidar basado en req.body
	headers?: string[]; // Opcional: Invalidar basado en req.headers
	userFields?: string[]; // Opcional: Invalidar basado en req.user
}
```

## Ejemplos de Uso

### Cache Simple

```typescript
@Get('all')
@Cache({ key: 'customers', ttl: '10M' })
async getAllCustomers() {
  return await this.customersService.getAllCustomers();
}
```

### Cache con Parámetros de Ruta

```typescript
@Get('company/:companyId')
@Cache({
  key: 'products:company',
  ttl: '10M',
  params: ['companyId']
})
async getProductsByCompany(@Param('companyId') companyId: number) {
  return await this.productsService.getProductsByCompany(companyId);
}
```

### Cache con Query Params

```typescript
@Get('search')
@Cache({
  key: 'products:search',
  ttl: '5M',
  query: ['q', 'category', 'limit', 'offset']
})
async searchProducts(@Query() dto: SearchProductsDto) {
  return await this.productsService.search(dto);
}
```

### Cache con Campos del Body

```typescript
@Post('advanced-search')
@Cache({
  key: 'products:advanced-search',
  ttl: '15M',
  body: ['category', 'brand', 'minPrice', 'maxPrice'],
  userId: true
})
async advancedSearch(@Body() dto: AdvancedSearchDto) {
  return await this.productsService.advancedSearch(dto);
}
```

### Cache con Headers

```typescript
@Get('dashboard')
@Cache({
  key: 'user:dashboard',
  ttl: '2M',
  headers: ['accept-language'],
  userId: true
})
async getDashboard() {
  return await this.dashboardService.getData();
}
```

### Cache con Campos del Usuario

```typescript
interface RequestUser {
	userId: string;
	username: string;
	sessionId: number;
	jti: string;
	companyId: number | null;
	isSuperRoot: boolean;
}

@Get('get-all-roles-and-permissions-by-user-id')
@Cache({
  key: 'user:roles-and-permissions',
  ttl: '5M',
  userFields: ['userId', 'companyId']  // Incluir campos específicos del usuario
})
async getAllRolesAndPermissionsByUserId(
  @Req() req: Request & { user: RequestUser }
) {
  return await this.authorizationService.getAllRolesAndPermissionsByUserId(req);
}
```

### Cache con Condiciones

```typescript
@Get('premium-content')
@Cache({
  key: 'content:premium',
  ttl: '1H',
  userId: true,
  condition: (req) => req.user?.isPremium === true
})
async getPremiumContent() {
  return await this.contentService.getPremium();
}
```

### Invalidation con Keys Específicas

```typescript
@Patch('update/:id')
@CacheInvalidate({
  keys: ['products', 'products:search']
})
async updateProduct(@Param('id') id: number, @Body() dto: UpdateProductDto) {
  return await this.productsService.update(id, dto);
}
```

### Invalidation con Patrones

```typescript
@Delete('delete/:id')
@CacheInvalidate({
  patterns: ['products:*', 'products:company:*', 'products:search:*']
})
async deleteProduct(@Param('id') id: number) {
  return await this.productsService.delete(id);
}
```

### Invalidation Mixta

```typescript
@Patch('update-bulk')
@CacheInvalidate({
  keys: ['products:featured'],
  patterns: ['products:search:*', 'products:category:*']
})
async updateBulkProducts(@Body() dto: UpdateBulkDto) {
  return await this.productsService.updateBulk(dto);
}
```

### Invalidation Dinámica con Params

```typescript
@Delete('products/:productId')
@CacheInvalidate({
  params: ['productId'],        // Invalida: productId:123
  patterns: ['products:*']      // Invalida: products:*
})
async deleteProduct(@Param('productId') productId: number) {
  return await this.productsService.delete(productId);
}
```

### Invalidation Dinámica con Body

```typescript
@Patch('update-company')
@CacheInvalidate({
  body: ['companyId'],          // Invalida: companyId:5
  patterns: ['company:*']       // Invalida: company:*
})
async updateCompany(@Body() dto: UpdateCompanyDto) {
  return await this.companiesService.update(dto);
}
```

### Invalidation Dinámica con User Fields

```typescript
@Post('update-user-preferences')
@CacheInvalidate({
  userFields: ['userId'],       // Invalida: user:userId:123
  patterns: ['user:*:preferences'] // Invalida: user:*:preferences
})
async updateUserPreferences(@Req() req: Request & { user: RequestUser }) {
  return await this.usersService.updatePreferences(req.user.userId);
}
```

### Invalidation Combinada (Estática + Dinámica)

```typescript
@Delete('companies/:companyId/users/:userId')
@CacheInvalidate({
  // Keys estáticas
  keys: ['users:all', 'companies:all'],

  // Keys dinámicas basadas en params
  params: ['companyId', 'userId'],

  // Patrones estáticos
  patterns: ['company:*', 'user:*', 'permissions:*']
})
async removeUserFromCompany(
  @Param('companyId') companyId: number,
  @Param('userId') userId: number
) {
  return await this.companiesService.removeUser(companyId, userId);
}
```

## Formato de Keys

Las keys se generan automáticamente usando el formato: `key:param1:value1:param2:value2:...`

### Ejemplos de Keys Generadas

#### Cache simple

```typescript
@Cache({ key: 'products', ttl: '5M' })
// Key generada: products
```

#### Con parámetro de ruta

```typescript
@Cache({ key: 'products:company', ttl: '5M', params: ['companyId'] })
// GET /products/company/5
// Key generada: products:company:companyId:5
```

#### Con query params

```typescript
@Cache({ key: 'products:search', ttl: '5M', query: ['q', 'limit'] })
// GET /products/search?q=iphone&limit=10
// Key generada: products:search:q:iphone:limit:10
```

#### Con campos del body

```typescript
@Cache({ key: 'products:filter', ttl: '5M', body: ['category', 'brand'] })
// POST /products/filter
// Body: { category: 'electronics', brand: 'apple' }
// Key generada: products:filter:category:electronics:brand:apple
```

#### Con userId

```typescript
@Cache({ key: 'user:preferences', ttl: '1H', userId: true })
// Key generada: user:preferences:user:123 (userId: 123)
```

#### Con campos del usuario

```typescript
@Cache({
  key: 'user:permissions',
  ttl: '5M',
  userFields: ['userId', 'companyId']
})
// Request con user: { userId: 123, companyId: 5 }
// Key generada: user:permissions:user:userId:123:user:companyId:5
```

#### Combinado

```typescript
@Cache({
  key: 'products:search',
  ttl: '10M',
  body: ['category'],
  query: ['limit', 'offset'],
  userId: true
})
// Key generada: products:search:user:456:category:electronics:limit:20:offset:0
```

## Formatos de TTL Soportados

El sistema soporta los siguientes formatos de tiempo (case-insensitive):

- `1S` - 1 segundo
- `5M` - 5 minutos
- `1H` - 1 hora
- `5D` - 5 días

### Variación de TTL

Todos los TTLs incluyen una variación aleatoria de ±10% para evitar que múltiples keys expiren simultáneamente (thundering herd problem).

Ejemplo:

- TTL configurado: `10M` (600 segundos)
- TTL real aplicado: Entre 540 y 660 segundos

## Comportamiento de Fallback

El sistema está diseñado para ser resiliente ante fallos de Redis:

### Fallback en Lectura

- Si Redis falla al leer, el sistema continúa ejecutando el endpoint normalmente
- Se registra un warning en los logs
- El usuario recibe la respuesta sin cache

### Fallback en Escritura

- Si Redis falla al escribir, el sistema devuelve la respuesta al usuario
- Se registra un warning en los logs
- La petición no se bloquea ni falla

### Ejemplo de Logs de Fallback

```typescript
// Redis no disponible o error de conexión
Cache read failed for key products:search: Error: connect ECONNREFUSED

// Error al escribir en cache
Cache write failed for key products:123: Error: Timeout
```

## Logging

El sistema incluye logging automático para facilitar el debugging:

```typescript
// Cache HIT
Cache HIT: products:company:companyId:5

// Cache MISS
Cache MISS: products:search:q:iphone:limit:10

// Invalidation exitosa
Cache invalidated: 15 keys/patterns

// Error de invalidación
Failed to invalidate cache: Error: connection timeout
```

## Servicios Disponibles

### CacheService

Servicio principal que puedes inyectar en tus servicios para operaciones manuales de cache.

```typescript
import { CacheService } from 'src/modules/cache/cache.service';

@Injectable()
export class MyService {
	constructor(private readonly cacheService: CacheService) {}

	async someMethod() {
		// Obtener del cache
		const data = await this.cacheService.get<MyType>('my-key');

		// Guardar en cache
		await this.cacheService.set('my-key', data, '10M');

		// Invalidar cache
		await this.cacheService.invalidate(
			['key1', 'key2'],
			['pattern1:*', 'pattern2:*'],
		);
	}
}
```

### Métodos de CacheService

- `get<T>(key: string): Promise<T | null>` - Obtener valor del cache
- `set(key: string, value: any, ttl: string): Promise<void>` - Guardar en cache
- `invalidate(keys?: string[], patterns?: string[]): Promise<number>` - Invalidar cache

## Patrón de Invalidation por Patrones

El sistema usa Redis SCAN para patrones de invalidación, lo que es seguro para instancias de Redis grandes.

### Uso de Wildcards

```typescript
// Invalidar todas las keys de productos
patterns: ['products:*'];

// Invalidar todas las keys de búsqueda
patterns: ['products:search:*'];

// Invalidar todas las keys de una compañía específica
patterns: ['products:company:5:*'];

// Invalidar múltiples patrones
patterns: ['products:*', 'customers:*', 'sales:*'];
```

## Notas Importantes

### 1. Módulo Global

El `CacheModule` está configurado como global (`@Global()`), por lo que no necesitas importarlo en cada módulo.

### 2. Orden de Decoradores

El orden de los decoradores puede ser importante. Generalmente:

```typescript
@Cache({...})                    // Primeramente
@UseGuards(JwtAuthGuard)
@RequirePermissions(['product:read'])
@Post('get-all')
async getAll() { ... }
```

### 3. Serialización

Las respuestas se serializan como JSON automáticamente. Asegúrate de que los objetos serializados no contengan:

- Funciones
- Instancias de clases complejas
- Datos sensibles en las keys

### 4. Keys Sensibles

Ten cuidado al incluir datos sensibles del body/query en las keys de cache, ya que estas se almacenan en Redis.

**Nota sobre userFields**: Los campos del usuario incluidos en las keys se almacenan en Redis. Asegúrate de que solo incluyas campos no sensibles como `userId`, `companyId`, etc. Evita incluir campos como `password`, `email` o información personal sensible.

### 5. Compatibilidad

El decorador `@Cache()` funciona con:

- `@Get`, `@Post`, `@Patch`, `@Put`, `@Delete`
- `@Body()`, `@Param()`, `@Query()`, `@Headers()`, `@Req()`
- Cualquier guard o interceptor
- Tipos extendidos de Request (como `Request & { user: RequestUser }`)

### 7. User Fields vs User ID

- **`userId: true`**: Incluye automáticamente `req.user.userId` en la key
- **`userFields: ['field1', 'field2']`**: Incluye campos específicos del usuario (`req.user.field1`, `req.user.field2`)
- **Diferencia**: `userId` es un atajo para un caso común, mientras que `userFields` permite campos personalizados
- **Uso típico**: Usa `userId` para cache simple por usuario, `userFields` para cache más granular

### 6. Performance

- Las operaciones de cache son no-blocking para el flujo principal
- La escritura en cache se hace en background
- La invalidación también es asíncrona

### 9. Invalidation Dinámica

La invalidación dinámica permite invalidar cache basado en valores del request actual:

- **`params`**: Invalida basado en parámetros de ruta (ej: `productId:123`)
- **`query`**: Invalida basado en parámetros de query (ej: `category:electronics`)
- **`body`**: Invalida basado en campos del body (ej: `companyId:5`)
- **`headers`**: Invalida basado en headers (ej: `authorization:Bearer...`)
- **`userFields`**: Invalida basado en campos del usuario (ej: `user:userId:456`)

**Ejemplo de flujo:**

1. Request: `DELETE /products/123` con body `{companyId: 5}`
2. Invalidation: `params: ['productId'], body: ['companyId']`
3. Keys generadas: `['productId:123', 'companyId:5']`
4. Resultado: Se invalidan esas keys específicas + cualquier patrón que coincida

## Buenas Prácticas

### 1. Estrategia de Keys

Usa keys descriptivas y jerárquicas:

```typescript
// ✅ Bueno
@Cache({ key: 'products:search:by-category', ttl: '5M' })

// ❌ Malo
@Cache({ key: 'p1', ttl: '5M' })
```

### 2. TTL Apropiados

Elige TTLs según la frecuencia de actualización:

```typescript
// Datos que cambian frecuentemente
@Cache({ key: 'stocks', ttl: '1M' })

// Datos que cambian ocasionalmente
@Cache({ key: 'products', ttl: '10M' })

// Datos relativamente estáticos
@Cache({ key: 'categories', ttl: '1H' })
```

### 3. Invalidation Granular

Usa patrones específicos para invalidar solo lo necesario:

```typescript
// ✅ Bueno: Invalidar solo búsquedas
@CacheInvalidate({ patterns: ['products:search:*'] })

// ❌ Malo: Invalidar todo
@CacheInvalidate({ patterns: ['*'] })
```

### 4. Invalidation Dinámica

Combina invalidación estática y dinámica para máxima precisión:

```typescript
// ✅ Excelente: Invalidation específica + patrones
@CacheInvalidate({
  params: ['productId'],        // Invalida el producto específico
  userFields: ['companyId'],    // Invalida por compañía
  patterns: ['products:*']      // Invalida búsquedas relacionadas
})

// ❌ Ineficiente: Solo patrones amplios
@CacheInvalidate({ patterns: ['*'] })
```

### 6. Condiciones

Usa condiciones para cachear selectivamente:

```typescript
@Cache({
  key: 'data',
  ttl: '5M',
  condition: (req) => req.method === 'GET' && req.user?.isActive === true
})
```

## Troubleshooting

### Problema: Cache no funciona

**Soluciones:**

1. Verifica que Redis esté corriendo: `redis-cli ping`
2. Verifica la URL de Redis en las variables de entorno
3. Revisa los logs del servidor

### Problema: Keys incorrectas

**Soluciones:**

1. Verifica los nombres de los parámetros en la URL
2. Asegúrate de que los campos del body coincidan
3. Revisa el caso de los headers (deben ser minúsculas)
4. Para `userFields`: Verifica que los campos existan en `req.user` y que no sean null/undefined

### Problema: Invalidation no funciona

**Soluciones:**

1. Verifica que los patrones coincidan con las keys generadas
2. Usa `redis-cli` para listar keys: `KEYS products:*`
3. Revisa los logs de invalidación

## Ejemplos Completos

### CRUD con Cache

```typescript
@Controller('products')
export class ProductsController {
	@Get('get-all')
	@Cache({ key: 'products', ttl: '10M' })
	async getAll() {
		return this.productsService.getAll();
	}

	@Get('company/:companyId')
	@Cache({ key: 'products:company', ttl: '10M', params: ['companyId'] })
	async getByCompany(@Param('companyId') companyId: number) {
		return this.productsService.getByCompany(companyId);
	}

	@Post('create')
	@CacheInvalidate({ patterns: ['products:*'] })
	async create(@Body() dto: CreateProductDto) {
		return this.productsService.create(dto);
	}

	@Patch('update/:id')
	@CacheInvalidate({
		patterns: ['products:*', 'products:search:*'],
	})
	async update(@Param('id') id: number, @Body() dto: UpdateProductDto) {
		return this.productsService.update(id, dto);
	}

	@Delete('delete/:id')
	@CacheInvalidate({ patterns: ['products:*'] })
	async delete(@Param('id') id: number) {
		return this.productsService.delete(id);
	}
}
```

### Sistema de Permisos con Cache

```typescript
interface RequestUser {
	userId: string;
	username: string;
	sessionId: number;
	jti: string;
	companyId: number | null;
	isSuperRoot: boolean;
}

@Controller('authorization')
export class AuthorizationController {
	// Cache basado en campos específicos del usuario
	@Get('get-all-roles-and-permissions-by-user-id')
	@Cache({
		key: 'user:roles-and-permissions',
		ttl: '5M',
		userFields: ['userId', 'companyId'], // Cache por usuario y compañía
	})
	async getAllRolesAndPermissionsByUserId(
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.authorizationService.getAllRolesAndPermissionsByUserId(
			req,
		);
	}

	// Cache basado en userId (más simple)
	@Get('permissions/get-all')
	@Cache({
		key: 'permissions:all',
		ttl: '10M',
		userId: true, // Cache por usuario
	})
	async getAllPermissions() {
		return this.authorizationService.getAllPermissions();
	}

	// Invalidación específica basada en el usuario que hace el cambio
	@Patch('roles/update')
	@CacheInvalidate({
		userFields: ['userId', 'companyId'], // Invalida cache del usuario específico
		patterns: ['user:roles-and-permissions:*'], // Invalida todos los caches de roles
	})
	async updateRole(
		@Req() req: Request & { user: RequestUser },
		@Body() dto: UpdateRoleDto,
	) {
		return this.authorizationService.updateRole(dto);
	}
}
```

## Referencias

- Documentación oficial de [NestJS](https://docs.nestjs.com/)
- Documentación de [ioredis](https://github.com/luin/ioredis)
- Documentación de [Redis](https://redis.io/docs/)
