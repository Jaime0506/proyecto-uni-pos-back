import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common';
import { CompanyService } from './companies.service';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { DeleteCompanyDto } from './dtos/delete-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
import { Cache } from '../cache/decorators/cache.decorator';
import { CacheInvalidate } from '../cache/decorators/cache-invalidate.decorator';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
	constructor(private readonly companyService: CompanyService) {}

	// Obtener todas las compañías (incluyendo desactivadas)
	@Get('get-all-companies')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['company_admin:read'])
	@Cache({
		key: 'companies:all',
		ttl: '1d',
	})
	@HttpCode(200)
	async getAllCompanies() {
		return await this.companyService.getAllCompanies();
	}

	// Crear una nueva compañía
	@Post('create-company')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['company_admin:create'])
	@CacheInvalidate({
		keys: ['companies:all'],
	})
	@HttpCode(200)
	async createCompany(@Body() dto: CreateCompanyDto) {
		return await this.companyService.createCompany(dto);
	}

	// Actualizar una compañía
	@Patch('update-company')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['company_admin:update'])
	@CacheInvalidate({
		keys: ['companies:all'],
	})
	@HttpCode(200)
	async updateCompany(@Body() dto: UpdateCompanyDto) {
		return await this.companyService.updateCompany(dto);
	}

	// Eliminar una compañía (soft delete)
	@Delete('delete-company')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['company_admin:delete'])
	@CacheInvalidate({
		keys: ['companies:all'],
	})
	@HttpCode(200)
	async deleteCompany(@Body() dto: DeleteCompanyDto) {
		return await this.companyService.deleteCompany(dto);
	}
}
