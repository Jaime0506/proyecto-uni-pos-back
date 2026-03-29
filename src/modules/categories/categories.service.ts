import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { GetCategoriesDto } from './dtos/get-categories.dto';

@Injectable()
export class CategoriesService {
	constructor(
		@InjectRepository(Category)
		private readonly categoryRepository: Repository<Category>,
	) {}

	// Crear una nueva categoría (o subcategoría si se envía parentId)
	async createCategory(dto: CreateCategoryDto) {
		try {
			// Comprobar unicidad nombre vs companyId
			const existing = await this.categoryRepository.findOne({
				where: { companyId: dto.companyId, name: dto.name },
				withDeleted: true,
			});
			if (existing) {
				if (existing.deletedAt) {
					throw new ConflictException(
						'Existe una categoría eliminada con este nombre. Restáurela o use un nombre diferente.',
					);
				}
				throw new ConflictException(
					'Ya existe una categoría con ese nombre en esta compañía.',
				);
			}

			const category = this.categoryRepository.create({
				name: dto.name,
				companyId: dto.companyId,
				parentId: dto.parentId || null,
			});

			// Validar si la categoría padre existe y pertenece a la misma compañía
			if (dto.parentId) {
				const parent = await this.categoryRepository.findOne({
					where: { id: dto.parentId },
				});
				if (!parent) {
					throw new NotFoundException('Categoría padre no encontrada.');
				}
				if (parent.companyId !== dto.companyId) {
					throw new BadRequestException(
						'La categoría padre pertenece a otra compañía.',
					);
				}
			}

			const saved = await this.categoryRepository.save(category);
			return {
				ok: true,
				message: 'Categoría creada exitosamente',
				data: { result: saved },
			};
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ConflictException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			console.error(error);
			throw new InternalServerErrorException(
				'Error interno al crear la categoría.',
			);
		}
	}

	// Obtener categorías (y opcionalmente anidadas)
	async getAllCategoriesAdminInternal() {
		try {
			const categories = await this.categoryRepository
				.createQueryBuilder('category')
				.withDeleted()
				.leftJoin('category.company', 'company')
				.leftJoinAndSelect('category.children', 'children')
				.select([
					'category.id',
					'category.companyId',
					'category.name',
					'category.parentId',
					'category.createdAt',
					'category.updatedAt',
					'category.deletedAt',
					'company.name',
					'children.id',
					'children.companyId',
					'children.name',
					'children.parentId',
					'children.createdAt',
					'children.updatedAt',
					'children.deletedAt',
				])
				.orderBy('category.name', 'ASC')
				.getMany();

			const result = categories.map((cat) => {
				const { company, ...rest } = cat;
				return {
					...rest,
					companyName: company?.name || '',
				};
			});

			return {
				ok: true,
				message: 'Categorías obtenidas correctamente',
				data: { result },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error interno al obtener categorías.',
			);
		}
	}

	// Obtener categorías (y opcionalmente anidadas)
	async getAllCategories(dto: GetCategoriesDto) {
		try {
			const query = this.categoryRepository
				.createQueryBuilder('category')
				.where('category.company_id = :companyId', {
					companyId: dto.companyId,
				})
				.orderBy('category.name', 'ASC');

			// Si mandan parentId, buscar en ese nivel. Si es explícitamente null/no enviado, podríamos querer las raíces o todas.
			if (dto.parentId) {
				query.andWhere('category.parent_id = :parentId', {
					parentId: dto.parentId,
				});
			}

			// Cargar los hijos si se desea en el frontend de forma estructurada
			query.leftJoinAndSelect('category.children', 'children');

			const result = await query.getMany();
			return {
				ok: true,
				message: 'Categorías obtenidas correctamente',
				data: { result },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error interno al obtener categorías.',
			);
		}
	}

	// Obtener una categoría por ID con sus hijos
	async getCategoryById(id: number) {
		try {
			const category = await this.categoryRepository.findOne({
				where: { id },
				relations: ['children', 'parent'],
			});

			if (!category) {
				throw new NotFoundException('Categoría no encontrada');
			}

			return {
				ok: true,
				message: 'Categoría encontrada',
				data: { result: category },
			};
		} catch (error) {
			if (error instanceof NotFoundException) throw error;
			console.error(error);
			throw new InternalServerErrorException(
				'Error interno al obtener la categoría.',
			);
		}
	}

	// Actualizar una categoría
	async updateCategory(id: number, dto: UpdateCategoryDto) {
		try {
			const category = await this.categoryRepository.findOne({ where: { id } });
			if (!category) {
				throw new NotFoundException('Categoría no encontrada');
			}

			if (dto.name && dto.name !== category.name) {
				const existing = await this.categoryRepository.findOne({
					where: { companyId: category.companyId, name: dto.name },
					withDeleted: true,
				});
				if (existing && existing.id !== id) {
					throw new ConflictException(
						'Ya existe una categoría con ese nombre en esta compañía.',
					);
				}
				category.name = dto.name;
			}

			if (dto.parentId !== undefined) {
				if (dto.parentId === id) {
					throw new BadRequestException(
						'Una categoría no puede ser su propio padre.',
					);
				}
				if (dto.parentId) {
					const parent = await this.categoryRepository.findOne({
						where: { id: dto.parentId },
					});
					if (!parent) {
						throw new NotFoundException('Categoría padre no encontrada.');
					}
					if (parent.companyId !== category.companyId) {
						throw new BadRequestException(
							'La categoría padre pertenece a otra compañía.',
						);
					}
				}
				category.parentId = dto.parentId || null;
			}

			const saved = await this.categoryRepository.save(category);

			return {
				ok: true,
				message: 'Categoría actualizada correctamente',
				data: { result: saved },
			};
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ConflictException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			console.error(error);
			throw new InternalServerErrorException(
				'Error interno al actualizar la categoría.',
			);
		}
	}

	// Eliminar (soft delete) y revisar hijos
	async deleteCategory(id: number, companyId: number) {
		try {
			const category = await this.categoryRepository.findOne({
				where: { id, companyId },
				relations: ['children'],
			});
			if (!category) {
				throw new NotFoundException('Categoría no encontrada');
			}

			// Podríamos hacer soft delete a sus hijos recursivamente o prohibir el borrado si tiene hijos
			if (category.children && category.children.length > 0) {
				throw new BadRequestException(
					'No se puede eliminar la categoría porque tiene subcategorías asociadas.',
				);
			}

			await this.categoryRepository.softRemove(category);

			return {
				ok: true,
				message: 'Categoría eliminada correctamente',
			};
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			console.error(error);
			throw new InternalServerErrorException(
				'Error interno al eliminar la categoría.',
			);
		}
	}
}
