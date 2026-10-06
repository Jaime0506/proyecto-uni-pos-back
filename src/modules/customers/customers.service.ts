import {
	Injectable,
	BadRequestException,
	InternalServerErrorException,
	ConflictException,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Company } from '../companies/entities/company.entity';
import { Store } from '../stores/entities/store.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Bonus } from '../sales/entities/bonuses.entity';
import { CustomerPortalService } from '../customer-portal/customer-portal.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { DeleteCustomerDto } from './dtos/delete-customer.dto';
import { StatusEnum } from 'src/core/status.enum';

@Injectable()
export class CustomersService {
	constructor(
		@InjectRepository(Customer)
		private readonly customerRepository: Repository<Customer>,
		@InjectRepository(Company)
		private readonly companyRepository: Repository<Company>,
		@InjectRepository(Store)
		private readonly storeRepository: Repository<Store>,
		@InjectRepository(Sale)
		private readonly saleRepository: Repository<Sale>,
		private readonly customerPortalService: CustomerPortalService,
	) {}

	// Obtener clientes enriquecidos con saldo de bonos y conteo de compras
	async getAllCustomers(companyId?: number, storeId?: number) {
		try {
			const qb = this.customerRepository
				.createQueryBuilder('c')
				.leftJoin(Bonus, 'b', 'b.customer_id = c.id')
				.leftJoin(Sale, 's', 's.customer_id = c.id AND s.deleted_at IS NULL')
				.select([
					'c.id AS id',
					'c.company_id AS "companyId"',
					'c.store_id AS "storeId"',
					'c.national_id AS "nationalId"',
					'c.first_name AS "firstName"',
					'c.last_name AS "lastName"',
					'c.phone AS phone',
					'c.email AS email',
					'c.status AS status',
					'c.created_at AS "createdAt"',
					'c.updated_at AS "updatedAt"',
					'c.deleted_at AS "deletedAt"',
					'COALESCE(MAX(b.total_amount), 0) AS "bonusBalance"',
					'COUNT(DISTINCT s.id) AS "salesCount"',
				])
				.groupBy('c.id')
				.orderBy('c.created_at', 'DESC');

			if (companyId) {
				qb.where('c.company_id = :companyId', { companyId });
			}

			if (storeId) {
				qb.andWhere('c.store_id = :storeId', {
					storeId,
				});
			}

			interface RawCustomerRow {
				id: number | string;
				companyId: number | string;
				storeId: number | string | null;
				nationalId: string;
				firstName: string | null;
				lastName: string | null;
				phone: string | null;
				email: string | null;
				status: StatusEnum;
				createdAt: Date;
				updatedAt: Date;
				deletedAt: Date | null;
				bonusBalance: number | string | null;
				salesCount: number | string;
			}

			const rawCustomers = await qb.getRawMany<RawCustomerRow>();

			const customers = rawCustomers.map((row: RawCustomerRow) => ({
				id: Number(row.id),
				companyId: Number(row.companyId),
				storeId: row.storeId ? Number(row.storeId) : null,
				nationalId: row.nationalId,
				firstName: row.firstName || '',
				lastName: row.lastName || '',
				phone: row.phone || '',
				email: row.email || '',
				status: row.status,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				deletedAt: row.deletedAt,
				bonusBalance: Number(row.bonusBalance || 0),
				salesCount: Number(row.salesCount || 0),
			}));

			return {
				ok: true,
				message: 'Clientes obtenidos correctamente',
				data: { result: customers },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener los clientes');
		}
	}

	// Crear un nuevo cliente (asociando obligatoriamente la tienda donde se registra - C1)
	async createCustomer(dto: CreateCustomerDto) {
		try {
			const {
				companyId,
				storeId,
				nationalId,
				firstName,
				lastName,
				phone,
				email,
			} = dto;

			// Verificar si la compañía existe
			const company = await this.companyRepository.findOne({
				where: { id: companyId },
				withDeleted: false,
			});

			if (!company) {
				throw new BadRequestException(
					`La compañía con ID ${companyId} no existe o está desactivada`,
				);
			}

			// C1: Verificar si la tienda existe y pertenece a la compañía
			const store = await this.storeRepository.findOne({
				where: { id: storeId, companyId },
				withDeleted: false,
			});

			if (!store) {
				throw new BadRequestException(
					`La tienda con ID ${storeId} no existe o no pertenece a la compañía`,
				);
			}

			// Verificar si ya existe un cliente con el mismo nationalId en la misma compañía
			const existingCustomer = await this.customerRepository.findOne({
				where: {
					company: { id: companyId },
					nationalId: nationalId,
				},
				withDeleted: false,
			});

			if (existingCustomer) {
				throw new ConflictException(
					`Ya existe un cliente con el número de identificación ${nationalId} en esta compañía`,
				);
			}

			// Crear el cliente
			const newCustomer = new Customer();
			newCustomer.company = company;
			newCustomer.companyId = company.id;
			newCustomer.store = store;
			newCustomer.storeId = store.id;
			newCustomer.nationalId = nationalId;
			if (firstName !== undefined) newCustomer.firstName = firstName;
			if (lastName !== undefined) newCustomer.lastName = lastName;
			if (phone !== undefined) newCustomer.phone = phone;
			if (email !== undefined) newCustomer.email = email;

			const savedCustomer = await this.customerRepository.save(newCustomer);

			return {
				ok: true,
				message: 'Cliente creado correctamente',
				data: { result: savedCustomer },
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof ConflictException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al crear el cliente');
		}
	}

	// Actualizar un cliente
	async updateCustomer(dto: UpdateCustomerDto) {
		try {
			const { id, companyId, nationalId, firstName, lastName, phone, email } =
				dto;

			// Verificar si el cliente existe
			const existingCustomer = await this.customerRepository.findOne({
				where: { id },
				relations: ['company'],
				withDeleted: true,
			});

			if (!existingCustomer) {
				throw new BadRequestException(`El cliente con ID ${id} no existe`);
			}

			// Si se proporciona un companyId diferente, verificar que la nueva compañía exista
			if (companyId && companyId !== existingCustomer.company.id) {
				const newCompany = await this.companyRepository.findOne({
					where: { id: companyId },
					withDeleted: false,
				});

				if (!newCompany) {
					throw new BadRequestException(
						`La compañía con ID ${companyId} no existe o está desactivada`,
					);
				}

				existingCustomer.company = newCompany;
			}

			// Si se proporciona un nationalId diferente, verificar que no exista otro cliente con ese ID en la misma compañía
			const finalCompanyId = companyId || existingCustomer.company.id;
			if (nationalId && nationalId !== existingCustomer.nationalId) {
				const customerWithSameNationalId =
					await this.customerRepository.findOne({
						where: {
							company: { id: finalCompanyId },
							nationalId: nationalId,
						},
						withDeleted: false,
					});

				if (
					customerWithSameNationalId &&
					customerWithSameNationalId.id !== id
				) {
					throw new ConflictException(
						`Ya existe un cliente con el número de identificación ${nationalId} en esta compañía`,
					);
				}

				existingCustomer.nationalId = nationalId;
			}

			// Actualizar campos
			if (firstName !== undefined) existingCustomer.firstName = firstName;
			if (lastName !== undefined) existingCustomer.lastName = lastName;
			if (phone !== undefined) existingCustomer.phone = phone;
			if (email !== undefined) existingCustomer.email = email;
			existingCustomer.updatedAt = new Date();

			const updatedCustomer =
				await this.customerRepository.save(existingCustomer);

			return {
				ok: true,
				message: 'Cliente actualizado correctamente',
				data: { result: updatedCustomer },
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof ConflictException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al actualizar el cliente');
		}
	}

	// Eliminar un cliente (soft delete) solo si no tiene historial de compras (C4)
	async deleteCustomer(dto: DeleteCustomerDto) {
		try {
			const { id } = dto;

			// Verificar si el cliente existe
			const existingCustomer = await this.customerRepository.findOne({
				where: { id },
				withDeleted: false,
			});

			if (!existingCustomer) {
				throw new BadRequestException(`El cliente con ID ${id} no existe`);
			}

			// C4: Restricción de compras - solo se puede eliminar si NO tiene compras
			const salesCount = await this.saleRepository.count({
				where: { customer_id: id, deleted_at: IsNull() },
			});

			if (salesCount > 0) {
				throw new ConflictException(
					'No es posible eliminar el cliente porque posee historial de compras en el sistema. Para restringir su acceso, cambie su estado a Inactivo.',
				);
			}

			// Eliminar el cliente (soft delete)
			existingCustomer.deletedAt = new Date();
			existingCustomer.updatedAt = new Date();
			existingCustomer.status = StatusEnum.DESACTIVE;

			const deletedCustomer =
				await this.customerRepository.save(existingCustomer);

			return {
				ok: true,
				message: 'Cliente eliminado correctamente',
				data: { result: deletedCustomer },
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof ConflictException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al eliminar el cliente');
		}
	}

	// Requerimiento C2, C5, C6: Obtener ficha y actividad 360° del cliente en la tienda
	async getCustomerActivity(
		customerId: number,
		companyId: number,
		storeId: number,
	) {
		try {
			const customer = await this.customerRepository.findOne({
				where: { id: customerId, companyId },
				withDeleted: true,
			});

			if (!customer) {
				throw new NotFoundException(
					`El cliente con ID ${customerId} no existe`,
				);
			}

			const [bonus, purchases, transactions, returns] = await Promise.all([
				this.customerPortalService.getBonus(customerId, companyId, storeId),
				this.customerPortalService.getPurchases(customerId, companyId, storeId),
				this.customerPortalService.getTransactions(
					customerId,
					companyId,
					storeId,
				),
				this.customerPortalService.getReturns(customerId, companyId, storeId),
			]);

			return {
				ok: true,
				message: 'Actividad del cliente obtenida correctamente',
				data: {
					customer: {
						id: customer.id,
						nationalId: customer.nationalId,
						firstName: customer.firstName || '',
						lastName: customer.lastName || '',
						phone: customer.phone || '',
						email: customer.email || '',
						status: customer.status,
						createdAt: customer.createdAt,
						updatedAt: customer.updatedAt,
						deletedAt: customer.deletedAt,
					},
					bonus,
					purchases,
					transactions,
					returns,
				},
			};
		} catch (error) {
			console.error(error);
			if (error instanceof NotFoundException) throw error;
			throw new InternalServerErrorException(
				'Error al obtener la actividad del cliente',
			);
		}
	}

	// Requerimiento B1: Restablecer contraseña del cliente desde la tienda
	async resetPassword(id: number) {
		try {
			const customer = await this.customerRepository.findOne({
				where: { id },
				withDeleted: false,
			});

			if (!customer) {
				throw new NotFoundException(`El cliente con ID ${id} no existe`);
			}

			customer.password = null;
			await this.customerRepository.save(customer);

			return {
				ok: true,
				message:
					'Contraseña restablecida exitosamente. El cliente podrá crear una nueva clave en su próximo ingreso al portal.',
			};
		} catch (error) {
			console.error(error);
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				'Error al restablecer la contraseña del cliente',
			);
		}
	}
}
