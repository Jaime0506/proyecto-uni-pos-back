import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	ParseIntPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { GetCategoriesDto } from './dtos/get-categories.dto';
import { Cache } from '../cache/decorators/cache.decorator';
import { CacheInvalidate } from '../cache/decorators/cache-invalidate.decorator';
import { DeleteCategoryDto } from './dtos/delete-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('categories')
export class CategoriesController {
	constructor(private readonly categoriesService: CategoriesService) {}

	@Post('create')
	@RequirePermissions(['category:create'])
	@ApiOperation({ summary: 'Crear una nueva categoría o subcategoría' })
	@CacheInvalidate({
		key: 'categories:all',
		body: ['companyId'],
	})
	createCategory(@Body() createCategoryDto: CreateCategoryDto) {
		return this.categoriesService.createCategory(createCategoryDto);
	}

	// No deberia tener cache porque no tengo forma correcta de invalidarla
	@Get('get-all-admin-internal')
	@RequirePermissions(['category_all:read'])
	@ApiOperation({ summary: 'Obtener todas las categorías de una compañía' })
	getAllCategoriesAdminInternal() {
		return this.categoriesService.getAllCategoriesAdminInternal();
	}

	@Get('get-all')
	@RequirePermissions(['category:read'])
	@Cache({
		key: 'categories:all',
		ttl: '12H',
		query: ['companyId'],
	})
	@ApiOperation({ summary: 'Obtener todas las categorías de una compañía' })
	getAllCategories(@Query() getCategoriesDto: GetCategoriesDto) {
		return this.categoriesService.getAllCategories(getCategoriesDto);
	}

	@Get(':id')
	@RequirePermissions(['category:read'])
	@ApiOperation({ summary: 'Obtener una categoría por su ID' })
	getCategoryById(@Param('id', ParseIntPipe) id: number) {
		return this.categoriesService.getCategoryById(id);
	}

	@Patch('update/:id')
	@RequirePermissions(['category:update'])
	@ApiOperation({ summary: 'Actualizar una categoría' })
	@CacheInvalidate({
		key: 'categories:all',
		body: ['companyId'],
	})
	updateCategory(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateCategoryDto: UpdateCategoryDto,
	) {
		return this.categoriesService.updateCategory(id, updateCategoryDto);
	}

	@Delete('delete/:id')
	@RequirePermissions(['category:delete'])
	@ApiOperation({ summary: 'Eliminar recursivamente una categoría' })
	@CacheInvalidate({
		key: 'categories:all',
		query: ['companyId'],
	})
	deleteCategory(
		@Param('id', ParseIntPipe) id: number,
		@Query() query: DeleteCategoryDto,
	) {
		return this.categoriesService.deleteCategory(id, query.companyId);
	}
}
