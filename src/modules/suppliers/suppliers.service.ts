import {
	Injectable,
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';
import { DeleteSupplierDto } from './dtos/delete-supplier.dto';
import { StatusEnum } from 'src/core/status.enum';

@Injectable()
export class SuppliersService {
	constructor(
		@InjectRepository(Supplier)
		private readonly supplierRepository: Repository<Supplier>,
		@InjectRepository(Company)
		private readonly companyRepository: Repository<Company>,
	) {}

	// Obtener todos los proveedores (incluyendo eliminados)
	async getAllSuppliers() {
		try {
			const suppliers = await this.supplierRepository.find({
				withDeleted: true,
				relations: ['company'],
			});

			return {
				ok: true,
				message: 'Proveedores obtenidos correctamente',
				data: { result: suppliers },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener los proveedores',
			);
		}
	}

	// Crear un nuevo proveedor
	async createSupplier(dto: CreateSupplierDto) {
		try {
			const { companyId, name, contactName, phone, email, address } = dto;

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

			// Crear el proveedor
			const newSupplier = new Supplier();

			newSupplier.company = company;
			newSupplier.name = name;
			newSupplier.status = StatusEnum.ACTIVE;

			if (contactName !== undefined) newSupplier.contactName = contactName;
			if (phone !== undefined) newSupplier.phone = phone;
			if (email !== undefined) newSupplier.email = email;
			if (address !== undefined) newSupplier.address = address;

			const savedSupplier = await this.supplierRepository.save(newSupplier);

			return {
				ok: true,
				message: 'Proveedor creado correctamente',
				data: { result: savedSupplier },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al crear el proveedor');
		}
	}

	// Actualizar un proveedor
	async updateSupplier(dto: UpdateSupplierDto) {
		try {
			const {
				id,
				companyId,
				name,
				contactName,
				phone,
				email,
				address,
				status,
			} = dto;

			// Verificar si el proveedor existe
			const existingSupplier = await this.supplierRepository.findOne({
				where: { id },
				relations: ['company'],
				withDeleted: true,
			});

			if (!existingSupplier) {
				throw new BadRequestException(`El proveedor ${id} no existe`);
			}

			// Si se proporciona un companyId diferente, verificar que la nueva compañía exista
			if (companyId && companyId !== existingSupplier.company.id) {
				const newCompany = await this.companyRepository.findOne({
					where: { id: companyId },
					withDeleted: false,
				});

				if (!newCompany) {
					throw new BadRequestException(
						`La compañía con ID ${companyId} no existe o está desactivada`,
					);
				}

				existingSupplier.company = newCompany;
			}

			// Actualizar campos
			if (name !== undefined) existingSupplier.name = name;
			if (contactName !== undefined) existingSupplier.contactName = contactName;
			if (phone !== undefined) existingSupplier.phone = phone;
			if (email !== undefined) existingSupplier.email = email;
			if (address !== undefined) existingSupplier.address = address;

			existingSupplier.updatedAt = new Date();

			if (status && status !== existingSupplier.status) {
				existingSupplier.status = status;
			}

			const updatedSupplier =
				await this.supplierRepository.save(existingSupplier);

			return {
				ok: true,
				message: 'Proveedor actualizado correctamente',
				data: { result: updatedSupplier },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				'Error al actualizar el proveedor',
			);
		}
	}

	// Eliminar un proveedor (soft delete)
	async deleteSupplier(dto: DeleteSupplierDto) {
		try {
			const { id } = dto;

			// Verificar si el proveedor existe
			const existingSupplier = await this.supplierRepository.findOne({
				where: { id },
				withDeleted: false,
			});

			if (!existingSupplier) {
				throw new BadRequestException(`El proveedor ${id} no existe`);
			}

			// Eliminar el proveedor (soft delete)
			existingSupplier.deletedAt = new Date();
			existingSupplier.updatedAt = new Date();

			const deletedSupplier =
				await this.supplierRepository.save(existingSupplier);

			return {
				ok: true,
				message: 'Proveedor eliminado correctamente',
				data: { result: deletedSupplier },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al eliminar el proveedor');
		}
	}
}
