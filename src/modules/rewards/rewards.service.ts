import {
	Injectable,
	BadRequestException,
	NotFoundException,
	ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RewardRule } from './entities/reward-rule.entity';
import { RewardRuleProduct } from './entities/reward-rule-product.entity';
import { RewardRuleCategory } from './entities/reward-rule-category.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateRewardRuleDto } from './dto/create-reward-rule.dto';
import { UpdateRewardRuleDto } from './dto/update-reward-rule.dto';
import { processTransaction } from '../../database/transactions';
import { RequestUser } from 'src/types/global';

@Injectable()
export class RewardsService {
	constructor(
		private readonly dataSource: DataSource,
		@InjectRepository(RewardRule)
		private readonly rewardRuleRepository: Repository<RewardRule>,
		@InjectRepository(RewardRuleProduct)
		private readonly rewardRuleProductRepository: Repository<RewardRuleProduct>,
		@InjectRepository(RewardRuleCategory)
		private readonly rewardRuleCategoryRepository: Repository<RewardRuleCategory>,
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
		@InjectRepository(Category)
		private readonly categoryRepository: Repository<Category>,
	) {}

	async createRewardRule(
		createRewardRuleDto: CreateRewardRuleDto,
		user: RequestUser,
	): Promise<RewardRule> {
		const { products, categories, ...rewardRuleData } = createRewardRuleDto;

		if (!user.isSuperRoot && user.companyId) {
			rewardRuleData.companyId = user.companyId;
		}

		if (
			(!products || products.length === 0) &&
			(!categories || categories.length === 0)
		) {
			throw new BadRequestException(
				'Debe especificar al menos un producto o una categoría para la regla de bonificación.',
			);
		}

		// Validar que todos los productos existan y tengan configuración válida si se proporcionaron
		if (products && products.length > 0) {
			for (const p of products) {
				if (!p.discountPercentage && !p.discountValue) {
					throw new BadRequestException(
						`El producto ID ${p.productId} debe tener un porcentaje o valor fijo de bonificación definido.`,
					);
				}
				if (p.maxQty && p.minQty > p.maxQty) {
					throw new BadRequestException(
						`En el producto ID ${p.productId}, la cantidad mínima (${p.minQty}) no puede ser mayor a la cantidad máxima (${p.maxQty}).`,
					);
				}
			}

			const productIds = products.map((p) => p.productId);
			const existingProducts = await this.productRepository.find({
				where: productIds.map((id) => ({ id })),
			});

			if (existingProducts.length !== productIds.length) {
				const foundIds = existingProducts.map((p) => p.id);
				const missingIds = productIds.filter((id) => !foundIds.includes(id));
				throw new BadRequestException(
					`Los siguientes productos no existen: ${missingIds.join(', ')}`,
				);
			}
		}

		// Validar que todas las categorías existan y tengan configuración válida si se proporcionaron
		if (categories && categories.length > 0) {
			for (const c of categories) {
				if (!c.discountPercentage && !c.discountValue) {
					throw new BadRequestException(
						`La categoría ID ${c.categoryId} debe tener un porcentaje o valor fijo de bonificación definido.`,
					);
				}
				if (c.maxQty && c.minQty > c.maxQty) {
					throw new BadRequestException(
						`En la categoría ID ${c.categoryId}, la cantidad mínima (${c.minQty}) no puede ser mayor a la cantidad máxima (${c.maxQty}).`,
					);
				}
			}

			const categoryIds = categories.map((c) => c.categoryId);
			const existingCategories = await this.categoryRepository.find({
				where: categoryIds.map((id) => ({ id })),
			});

			if (existingCategories.length !== categoryIds.length) {
				const foundCatIds = existingCategories.map((c) => c.id);
				const missingCatIds = categoryIds.filter(
					(id) => !foundCatIds.includes(id),
				);
				throw new BadRequestException(
					`Las siguientes categorías no existen: ${missingCatIds.join(', ')}`,
				);
			}
		}

		// Validar fechas si se proporcionan
		if (rewardRuleData.startsAt && rewardRuleData.endsAt) {
			const startDate = new Date(rewardRuleData.startsAt);
			const endDate = new Date(rewardRuleData.endsAt);

			if (startDate >= endDate) {
				throw new BadRequestException(
					'La fecha de inicio debe ser anterior a la fecha de fin',
				);
			}
		}

		// Crear la regla de recompensa, productos y categorías en una transacción
		return await processTransaction(this.dataSource, async (queryRunner) => {
			const rewardRuleRepo = queryRunner.manager.getRepository(RewardRule);
			const rewardRuleProductRepo =
				queryRunner.manager.getRepository(RewardRuleProduct);
			const rewardRuleCategoryRepo =
				queryRunner.manager.getRepository(RewardRuleCategory);

			// Crear la regla de recompensa
			const rewardRule = rewardRuleRepo.create({
				...rewardRuleData,
				createdBy: user.userId,
				startsAt: rewardRuleData.startsAt
					? new Date(rewardRuleData.startsAt)
					: null,
				endsAt: rewardRuleData.endsAt ? new Date(rewardRuleData.endsAt) : null,
			});

			const savedRewardRule = await rewardRuleRepo.save(rewardRule);

			// Crear los productos de la regla si existen
			if (products && products.length > 0) {
				const rewardRuleProducts = products.map((productData) =>
					rewardRuleProductRepo.create({
						...productData,
						rewardRuleId: savedRewardRule.id,
					}),
				);
				await rewardRuleProductRepo.save(rewardRuleProducts);
			}

			// Crear las categorías de la regla si existen
			if (categories && categories.length > 0) {
				const rewardRuleCategories = categories.map((catData) =>
					rewardRuleCategoryRepo.create({
						...catData,
						rewardRuleId: savedRewardRule.id,
					}),
				);
				await rewardRuleCategoryRepo.save(rewardRuleCategories);
			}

			// Cargar la regla completa con sus relaciones
			const completeRewardRule = await rewardRuleRepo.findOne({
				where: { id: savedRewardRule.id },
				relations: [
					'products',
					'products.product',
					'categories',
					'categories.category',
					'company',
					'store',
					'createdByUser',
				],
			});

			if (!completeRewardRule) {
				throw new BadRequestException('Error al crear la regla de recompensa');
			}

			return completeRewardRule;
		});
	}

	async getRewardRules(
		companyId: number,
		storeId: number,
		user: RequestUser,
	): Promise<RewardRule[]> {
		const effectiveCompanyId =
			!user.isSuperRoot && user.companyId ? user.companyId : companyId;

		return await this.rewardRuleRepository.find({
			where: {
				...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
				...(storeId ? { storeId } : {}),
			},
			relations: [
				'products',
				'products.product',
				'categories',
				'categories.category',
				'company',
				'store',
				'createdByUser',
			],
			order: { createdAt: 'DESC' },
		});
	}

	async getRewardRuleById(id: number, user: RequestUser): Promise<RewardRule> {
		const rule = await this.rewardRuleRepository.findOne({
			where: { id },
			relations: [
				'products',
				'products.product',
				'categories',
				'categories.category',
				'company',
				'store',
				'createdByUser',
			],
		});

		if (!rule) {
			throw new NotFoundException(
				`Regla de bonificación con ID ${id} no encontrada`,
			);
		}

		if (
			!user.isSuperRoot &&
			user.companyId &&
			rule.companyId !== user.companyId
		) {
			throw new ForbiddenException(
				'No tiene permisos para consultar reglas de bonificación de otra empresa',
			);
		}

		return rule;
	}

	async updateRewardRule(
		id: number,
		updateRewardRuleDto: UpdateRewardRuleDto,
		user: RequestUser,
	): Promise<RewardRule> {
		const existingRule = await this.rewardRuleRepository.findOne({
			where: { id },
			relations: ['products', 'categories'],
		});

		if (!existingRule) {
			throw new NotFoundException(
				`Regla de bonificación con ID ${id} no encontrada`,
			);
		}

		if (
			!user.isSuperRoot &&
			user.companyId &&
			existingRule.companyId !== user.companyId
		) {
			throw new ForbiddenException(
				'No tiene permisos para modificar reglas de bonificación de otra empresa',
			);
		}

		const { products, categories, ...rewardRuleData } = updateRewardRuleDto;

		// Si se pasan ambos products y categories como arrays vacíos
		if (products !== undefined && categories !== undefined) {
			if (products.length === 0 && categories.length === 0) {
				throw new BadRequestException(
					'Debe especificar al menos un producto o una categoría para la regla de bonificación.',
				);
			}
		} else if (products !== undefined && products.length === 0) {
			if (!existingRule.categories || existingRule.categories.length === 0) {
				throw new BadRequestException(
					'Debe especificar al menos un producto o una categoría para la regla de bonificación.',
				);
			}
		} else if (categories !== undefined && categories.length === 0) {
			if (!existingRule.products || existingRule.products.length === 0) {
				throw new BadRequestException(
					'Debe especificar al menos un producto o una categoría para la regla de bonificación.',
				);
			}
		}

		// Validar productos si se proporcionaron
		if (products && products.length > 0) {
			for (const p of products) {
				if (!p.discountPercentage && !p.discountValue) {
					throw new BadRequestException(
						`El producto ID ${p.productId} debe tener un porcentaje o valor fijo de bonificación definido.`,
					);
				}
				if (p.maxQty && p.minQty > p.maxQty) {
					throw new BadRequestException(
						`En el producto ID ${p.productId}, la cantidad mínima (${p.minQty}) no puede ser mayor a la cantidad máxima (${p.maxQty}).`,
					);
				}
			}

			const productIds = products.map((p) => p.productId);
			const existingProducts = await this.productRepository.find({
				where: productIds.map((pid) => ({ id: pid })),
			});

			if (existingProducts.length !== productIds.length) {
				const foundIds = existingProducts.map((p) => p.id);
				const missingIds = productIds.filter((pid) => !foundIds.includes(pid));
				throw new BadRequestException(
					`Los siguientes productos no existen: ${missingIds.join(', ')}`,
				);
			}
		}

		// Validar categorías si se proporcionaron
		if (categories && categories.length > 0) {
			for (const c of categories) {
				if (!c.discountPercentage && !c.discountValue) {
					throw new BadRequestException(
						`La categoría ID ${c.categoryId} debe tener un porcentaje o valor fijo de bonificación definido.`,
					);
				}
				if (c.maxQty && c.minQty > c.maxQty) {
					throw new BadRequestException(
						`En la categoría ID ${c.categoryId}, la cantidad mínima (${c.minQty}) no puede ser mayor a la cantidad máxima (${c.maxQty}).`,
					);
				}
			}

			const categoryIds = categories.map((c) => c.categoryId);
			const existingCategories = await this.categoryRepository.find({
				where: categoryIds.map((cid) => ({ id: cid })),
			});

			if (existingCategories.length !== categoryIds.length) {
				const foundCatIds = existingCategories.map((c) => c.id);
				const missingCatIds = categoryIds.filter(
					(cid) => !foundCatIds.includes(cid),
				);
				throw new BadRequestException(
					`Las siguientes categorías no existen: ${missingCatIds.join(', ')}`,
				);
			}
		}

		// Validar fechas
		const startDate =
			rewardRuleData.startsAt !== undefined
				? rewardRuleData.startsAt
					? new Date(rewardRuleData.startsAt)
					: null
				: existingRule.startsAt;
		const endDate =
			rewardRuleData.endsAt !== undefined
				? rewardRuleData.endsAt
					? new Date(rewardRuleData.endsAt)
					: null
				: existingRule.endsAt;

		if (startDate && endDate && startDate >= endDate) {
			throw new BadRequestException(
				'La fecha de inicio debe ser anterior a la fecha de fin',
			);
		}

		return await processTransaction(this.dataSource, async (queryRunner) => {
			const rewardRuleRepo = queryRunner.manager.getRepository(RewardRule);
			const rewardRuleProductRepo =
				queryRunner.manager.getRepository(RewardRuleProduct);
			const rewardRuleCategoryRepo =
				queryRunner.manager.getRepository(RewardRuleCategory);

			// Actualizar campos de la regla
			if (rewardRuleData.title !== undefined) {
				existingRule.title = rewardRuleData.title;
			}
			if (rewardRuleData.description !== undefined) {
				existingRule.description = rewardRuleData.description;
			}
			if (rewardRuleData.startsAt !== undefined) {
				existingRule.startsAt = startDate;
			}
			if (rewardRuleData.endsAt !== undefined) {
				existingRule.endsAt = endDate;
			}
			if (rewardRuleData.isActive !== undefined) {
				existingRule.isActive = rewardRuleData.isActive;
			}
			if (rewardRuleData.storeId !== undefined) {
				existingRule.storeId = rewardRuleData.storeId;
			}
			if (
				rewardRuleData.companyId !== undefined &&
				(user.isSuperRoot || rewardRuleData.companyId === user.companyId)
			) {
				existingRule.companyId = rewardRuleData.companyId;
			}

			await rewardRuleRepo.save(existingRule);

			// Si se especificaron productos, reemplazar relaciones
			if (products !== undefined) {
				await rewardRuleProductRepo.delete({ rewardRuleId: id });
				if (products.length > 0) {
					const rewardRuleProducts = products.map((productData) =>
						rewardRuleProductRepo.create({
							...productData,
							rewardRuleId: id,
						}),
					);
					await rewardRuleProductRepo.save(rewardRuleProducts);
				}
			}

			// Si se especificaron categorías, reemplazar relaciones
			if (categories !== undefined) {
				await rewardRuleCategoryRepo.delete({ rewardRuleId: id });
				if (categories.length > 0) {
					const rewardRuleCategories = categories.map((catData) =>
						rewardRuleCategoryRepo.create({
							...catData,
							rewardRuleId: id,
						}),
					);
					await rewardRuleCategoryRepo.save(rewardRuleCategories);
				}
			}

			// Cargar regla completa
			const completeRewardRule = await rewardRuleRepo.findOne({
				where: { id },
				relations: [
					'products',
					'products.product',
					'categories',
					'categories.category',
					'company',
					'store',
					'createdByUser',
				],
			});

			if (!completeRewardRule) {
				throw new BadRequestException(
					'Error al actualizar la regla de bonificación',
				);
			}

			return completeRewardRule;
		});
	}

	async toggleRewardRuleStatus(
		id: number,
		user: RequestUser,
	): Promise<RewardRule> {
		const rule = await this.rewardRuleRepository.findOne({
			where: { id },
			relations: [
				'products',
				'products.product',
				'categories',
				'categories.category',
				'company',
				'store',
				'createdByUser',
			],
		});

		if (!rule) {
			throw new NotFoundException(
				`Regla de bonificación con ID ${id} no encontrada`,
			);
		}

		if (
			!user.isSuperRoot &&
			user.companyId &&
			rule.companyId !== user.companyId
		) {
			throw new ForbiddenException(
				'No tiene permisos para modificar reglas de bonificación de otra empresa',
			);
		}

		rule.isActive = !rule.isActive;
		return await this.rewardRuleRepository.save(rule);
	}

	async deleteRewardRule(
		id: number,
		user: RequestUser,
	): Promise<{ message: string; id: number }> {
		const rule = await this.rewardRuleRepository.findOne({ where: { id } });

		if (!rule) {
			throw new NotFoundException(
				`Regla de bonificación con ID ${id} no encontrada`,
			);
		}

		if (
			!user.isSuperRoot &&
			user.companyId &&
			rule.companyId !== user.companyId
		) {
			throw new ForbiddenException(
				'No tiene permisos para eliminar reglas de bonificación de otra empresa',
			);
		}

		await this.rewardRuleRepository.softDelete(id);
		return {
			message: 'Regla de bonificación eliminada exitosamente',
			id,
		};
	}
}
