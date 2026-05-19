import {
	Injectable,
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bonus } from './entities/bonification.entity';
import { Customer } from '../sales/entities/customer.entity';
import { GetAllBonificationsDto } from './dto/get-all-bonifications.dto';
import { UpdateBonificationDto } from './dto/update-bonification.dto';

@Injectable()
export class BonificationsService {
	constructor(
		@InjectRepository(Bonus)
		private readonly bonusRepository: Repository<Bonus>,
		@InjectRepository(Customer)
		private readonly customerRepository: Repository<Customer>,
	) {}

	// Obtener todas las bonificaciones
	async getAllBonifications(dto: GetAllBonificationsDto) {
		try {
			const query = this.bonusRepository
				.createQueryBuilder('bonus')
				.leftJoin(Customer, 'customer', 'customer.id = bonus.customer_id')
				.select([
					'bonus.id',
					'bonus.customer_id',
					'bonus.total_amount',
					'bonus.created_at',
					'bonus.updated_at',
					'customer.id',
					'customer.nationalId',
					'customer.firstName',
					'customer.lastName',
					'customer.phone',
					'customer.email',
				]);

			query.where('bonus.company_id = :companyId', {
				companyId: dto.companyId,
			});

			query.andWhere('bonus.store_id = :storeId', {
				storeId: dto.storeId,
			});

			if (dto.customerId) {
				query.andWhere('bonus.customer_id = :customerId', {
					customerId: dto.customerId,
				});
			}

			const rawResults = await query.getRawMany();

			// Mapear los resultados para incluir customer con firstName y lastName
			const result = rawResults.map((row) => {
				const bonusData: any = {
					id: row.bonus_id,
					customer_id: row.bonus_customer_id,
					total_amount: row.bonus_total_amount,
					created_at: row.bonus_created_at,
					updated_at: row.bonus_updated_at,
				};

				// Incluir datos del customer si existe (usando nombres de columna de BD: snake_case)
				if (row.customer_id) {
					bonusData.customer = {
						id: row.customer_id,
						nationalId: row.customer_national_id,
						firstName: row.customer_first_name,
						lastName: row.customer_last_name,
						phone: row.customer_phone,
						email: row.customer_email,
					};
				}

				return bonusData;
			});

			return {
				ok: true,
				message: 'Bonificaciones obtenidas correctamente',
				data: { result },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener las bonificaciones',
			);
		}
	}

	// Actualizar una bonificación
	async updateBonification(dto: UpdateBonificationDto) {
		try {
			const { id, customer_id, total_amount } = dto;

			// Verificar si la bonificación existe
			const existingBonus = await this.bonusRepository.findOne({
				where: { id },
			});

			if (!existingBonus) {
				throw new BadRequestException(`La bonificación con ID ${id} no existe`);
			}

			// Si se proporciona un customer_id diferente, verificar que el nuevo cliente exista
			if (customer_id && customer_id !== existingBonus.customer_id) {
				const newCustomer = await this.customerRepository.findOne({
					where: { id: customer_id },
					withDeleted: false,
				});

				if (!newCustomer) {
					throw new BadRequestException(
						`El cliente con ID ${customer_id} no existe o está desactivado`,
					);
				}

				// Verificar que no exista otra bonificación con ese customer_id
				const existingBonusWithCustomer = await this.bonusRepository.findOne({
					where: { customer_id },
				});

				if (existingBonusWithCustomer && existingBonusWithCustomer.id !== id) {
					throw new BadRequestException(
						`Ya existe una bonificación para el cliente con ID ${customer_id}`,
					);
				}

				existingBonus.customer_id = customer_id;
			}

			// Actualizar campos
			if (total_amount !== undefined) {
				existingBonus.total_amount = total_amount;
			}

			existingBonus.updated_at = new Date();

			const updatedBonus = await this.bonusRepository.save(existingBonus);

			return {
				ok: true,
				message: 'Bonificación actualizada correctamente',
				data: { result: updatedBonus },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				'Error al actualizar la bonificación',
			);
		}
	}
}
