import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RewardRule } from './entities/reward-rule.entity';
import { RewardRuleProduct } from './entities/reward-rule-product.entity';
import { Product } from '../products/entities/product.entity';
import { CreateRewardRuleDto } from './dto/create-reward-rule.dto';
import { processTransaction } from '../../database/transactions';

@Injectable()
export class RewardsService {
	constructor(
		private readonly dataSource: DataSource,
		@InjectRepository(RewardRule)
		private readonly rewardRuleRepository: Repository<RewardRule>,
		@InjectRepository(RewardRuleProduct)
		private readonly rewardRuleProductRepository: Repository<RewardRuleProduct>,
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
	) {}

	async createRewardRule(
		createRewardRuleDto: CreateRewardRuleDto,
		createdBy: string,
	): Promise<RewardRule> {
		const { products, ...rewardRuleData } = createRewardRuleDto;

		// Validar que todos los productos existan
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

		// Crear la regla de recompensa y sus productos en una transacción
		return await processTransaction(this.dataSource, async (queryRunner) => {
			const rewardRuleRepo = queryRunner.manager.getRepository(RewardRule);
			const rewardRuleProductRepo =
				queryRunner.manager.getRepository(RewardRuleProduct);

			// Crear la regla de recompensa
			const rewardRule = rewardRuleRepo.create({
				...rewardRuleData,
				createdBy,
				startsAt: rewardRuleData.startsAt
					? new Date(rewardRuleData.startsAt)
					: null,
				endsAt: rewardRuleData.endsAt ? new Date(rewardRuleData.endsAt) : null,
			});

			const savedRewardRule = await rewardRuleRepo.save(rewardRule);

			// Crear los productos de la regla de recompensa
			const rewardRuleProducts = products.map((productData) =>
				rewardRuleProductRepo.create({
					...productData,
					rewardRuleId: savedRewardRule.id,
				}),
			);

			await rewardRuleProductRepo.save(rewardRuleProducts);

			// Cargar la regla completa con sus productos para retornarla
			const completeRewardRule = await rewardRuleRepo.findOne({
				where: { id: savedRewardRule.id },
				relations: [
					'products',
					'products.product',
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
	): Promise<RewardRule[]> {
		return await this.rewardRuleRepository.find({
			where: { companyId, storeId },
			relations: [
				'products',
				'products.product',
				'company',
				'store',
				'createdByUser',
			],
			order: { createdAt: 'DESC' },
		});
	}

	async getRewardRuleById(id: number): Promise<RewardRule | null> {
		return await this.rewardRuleRepository.findOne({
			where: { id },
			relations: [
				'products',
				'products.product',
				'company',
				'store',
				'createdByUser',
			],
		});
	}
}
