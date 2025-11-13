import {
	Injectable,
	BadRequestException,
	InternalServerErrorException,
	ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Company } from '../companies/entities/company.entity';
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
	) {}

	// Obtener todos los clientes (incluyendo eliminados)
	async getAllCustomers() {
		try {
			const customers = await this.customerRepository.find({
				withDeleted: true,
				relations: ['company'],
			});

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

	// Crear un nuevo cliente
	async createCustomer(dto: CreateCustomerDto) {
		try {
			const { companyId, nationalId, firstName, lastName, phone, email } = dto;

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

	// Eliminar un cliente (soft delete)
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
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al eliminar el cliente');
		}
	}
}
