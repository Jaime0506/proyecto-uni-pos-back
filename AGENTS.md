# AGENTS.md

This file provides guidelines for agentic coding assistants working in this NestJS backend repository.

## Build/Lint/Test Commands

```bash
# Build the project
npm run build

# Run development server with SWC (fast)
npm run start:dev

# Run development server with SWC and type checking
npm run start:dev:swc:types

# Production build and start
npm run build && npm run start:prod

# Lint and auto-fix code issues
npm run lint

# Format code with Prettier
npm run format

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run e2e tests
npm run test:e2e

# Run a single test file
jest path/to/test.spec.ts
# or
npm test -- path/to/test.spec.ts

# Run tests matching a pattern
npm test -- --testNamePattern="test name"
```

## Code Style Guidelines

### Imports

- Use absolute imports from 'src' (e.g., `import { StatusEnum } from 'src/core/status.enum'`)
- Group imports with blank lines: external libraries → internal modules
- Use named imports for NestJS decorators and utilities
- Example:
  ```typescript
  import { Injectable, BadRequestException } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Customer } from './entities/customer.entity';
  import { CreateCustomerDto } from './dtos/create-customer.dto';
  ```

### Formatting (Prettier)

- Use single quotes (`)
- Use tabs for indentation (2 spaces width)
- Add trailing commas to all objects/arrays
- Let Prettier handle end-of-line characters

### Types and TypeScript

- Use classes for DTOs and entities (interfaces are less common)
- Mark optional fields with `?`
- Use definite assignment assertion `!` for required class properties in DTOs
- Leverage TypeORM decorators for entities
- Use class-validator decorators for DTO validation

### Naming Conventions

- Files: kebab-case (e.g., `customers.service.ts`, `create-customer.dto.ts`)
- Classes: PascalCase (e.g., `CustomersService`, `Customer`)
- Methods/Variables: camelCase (e.g., `getAllCustomers`, `companyId`)
- DTO suffix: `Dto` (e.g., `CreateCustomerDto`)
- Entity files: no suffix, just the name (e.g., `customer.entity.ts`)

### Project Structure

Each module follows this pattern:

```
src/modules/{module-name}/
  ├── {module-name}.module.ts
  ├── {module-name}.controller.ts
  ├── {module-name}.service.ts
  ├── dtos/
  │   ├── create-{resource}.dto.ts
  │   ├── update-{resource}.dto.ts
  │   └── delete-{resource}.dto.ts
  └── entities/
      └── {resource}.entity.ts
```

### Controllers

- Use decorators: `@Controller('resource')`, `@Get`, `@Post`, `@Patch`, `@Delete`
- Apply guards: `@UseGuards(JwtAuthGuard)`, `@UseGuards(PermissionGuard)`
- Require permissions: `@RequirePermissions(['resource:action'])`
- Set explicit status codes: `@HttpCode(200)`
- Document with Swagger: `@ApiBearerAuth()`, `@ApiProperty()`
- Route names: kebab-case actions (e.g., `@Get('get-all')`, `@Post('create')`)

### Services

- Mark with `@Injectable()`
- Inject repositories: `@InjectRepository(Entity) private readonly repo: Repository<Entity>`
- Use try-catch blocks for error handling
- Return consistent response objects: `{ ok: boolean, message: string, data?: { result?: any } }`
- Throw specific exceptions: `BadRequestException`, `ConflictException`, `InternalServerErrorException`
- Use soft deletes with `withDeleted: true/false` in queries

### DTOs

- Use class-validator decorators: `@IsNotEmpty()`, `@IsString()`, `@IsEmail()`, `@IsOptional()`
- Document fields with Swagger: `@ApiProperty()`, `@ApiPropertyOptional()`
- Use `!` for required properties in DTOs
- Use `?` for optional properties

### Entities

- Use TypeORM decorators: `@Entity({ name, schema })`, `@PrimaryGeneratedColumn`, `@Column`
- Use camelCase property names with column names mapped to snake_case
- Add indexes for frequently queried fields: `@Index('name', ['field1', 'field2'])`
- Use unique constraints: `@Unique(['field1', 'field2'])`
- Include audit columns: `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn`
- Use `JoinColumn` for many-to-one relationships
- Import using absolute paths: `import { StatusEnum } from 'src/core/status.enum'`

### Error Handling

- Try-catch in service methods
- Re-throw specific exceptions: check `instanceof BadRequestException`
- Throw new exceptions with descriptive Spanish messages
- Log errors with `console.error(error)`

### Response Format

Standard response structure:

```typescript
{
  ok: true,
  message: 'Descripción del resultado',
  data: { result: object }
}
```

### Guards and Authorization

- Use `JwtAuthGuard` for authentication
- Use `PermissionGuard` with `@RequirePermissions(['resource:action'])`
- Import from auth module: `import { PermissionGuard, RequirePermissions } from '../auth/authorization-guard'`

### Database Operations

- Use TypeORM repository pattern
- Use `findOne` with `where` clause for queries
- Load relations with `relations: ['entity']`
- Use `save()` for creates and updates (supports partial updates)
- Implement soft deletes with `deletedAt` timestamp

### Comments and Documentation

- Use Spanish for comments and user-facing messages
- Add comments before methods (e.g., `// Crear un nuevo cliente`)
- Document API endpoints with Swagger decorators
