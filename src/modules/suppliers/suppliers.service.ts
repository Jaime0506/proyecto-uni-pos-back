import {
	Injectable,
	BadRequestException,
	ForbiddenException,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { Company } from '../companies/entities/company.entity';
import { UserCompanyMembership } from '../users/entities/user-company-membership.entity';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';
import { DeleteSupplierDto } from './dtos/delete-supplier.dto';
import { StatusEnum } from 'src/core/status.enum';
import { RequestUser } from 'src/types/global';

@Injectable()
export class SuppliersService {
	constructor(
		@InjectRepository(Supplier)
		private readonly supplierRepository: Repository<Supplier>,
		@InjectRepository(Company)
		private readonly companyRepository: Repository<Company>,
		private readonly dataSource: DataSource,
	) {}

	private async getUserCompanyId(user?: RequestUser): Promise<number | null> {
		if (!user) return null;
		if (user.companyId) return user.companyId;
		const membership = await this.dataSource
			.getRepository(UserCompanyMembership)
			.findOne({
				where: { userId: user.userId, isActive: true },
			});
		return membership ? membership.companyId : null;
	}

	// Obtener proveedores por compañía (excluyendo eliminados y aislando por empresa)
	async getAllSuppliers(user?: RequestUser, companyId?: number) {
		try {
			const whereClause: any = {};

			if (user && !user.isSuperRoot) {
				const userCompanyId = await this.getUserCompanyId(user);
				if (!userCompanyId) {
					return {
						ok: true,
						message: 'El usuario no tiene una compañía asignada',
						data: { result: [] },
					};
				}
				// Aislamiento estricto por compañía del usuario autenticado
				whereClause.company = { id: userCompanyId };
			} else if (companyId) {
				whereClause.company = { id: companyId };
			}

			const suppliers = await this.supplierRepository.find({
				where: whereClause,
				withDeleted: false,
				relations: ['company'],
				order: { id: 'DESC' },
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
	async createSupplier(dto: CreateSupplierDto, user?: RequestUser) {
		try {
			let { companyId } = dto;
			const { name, nit, contactName, phone, email, address } = dto;

			if (user && !user.isSuperRoot) {
				const userCompanyId = await this.getUserCompanyId(user);
				if (!userCompanyId) {
					throw new BadRequestException('El usuario no tiene una compañía asignada');
				}
				companyId = userCompanyId;
			}

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

			if (nit !== undefined) newSupplier.nit = nit;
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
	async updateSupplier(dto: UpdateSupplierDto, user?: RequestUser) {
		try {
			const {
				id,
				name,
				nit,
				contactName,
				phone,
				email,
				address,
				status,
			} = dto;
			let { companyId } = dto;

			// Verificar si el proveedor existe
			const existingSupplier = await this.supplierRepository.findOne({
				where: { id },
				relations: ['company'],
				withDeleted: true,
			});

			if (!existingSupplier) {
				throw new BadRequestException(`El proveedor ${id} no existe`);
			}

			if (user && !user.isSuperRoot) {
				const userCompanyId = await this.getUserCompanyId(user);
				if (!userCompanyId || existingSupplier.company?.id !== userCompanyId) {
					throw new ForbiddenException('No tienes permisos para modificar proveedores de otra compañía');
				}
				companyId = userCompanyId;
			}

			// Si se proporciona un companyId diferente y es superRoot
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
			if (nit !== undefined) existingSupplier.nit = nit;
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
			if (error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				'Error al actualizar el proveedor',
			);
		}
	}

	// Eliminar un proveedor (soft delete) validando que no tenga operaciones
	async deleteSupplier(dto: DeleteSupplierDto, user?: RequestUser) {
		try {
			const { id } = dto;

			// Verificar si el proveedor existe
			const existingSupplier = await this.supplierRepository.findOne({
				where: { id },
				relations: ['company'],
				withDeleted: false,
			});

			if (!existingSupplier) {
				throw new BadRequestException(
					`El proveedor ${id} no existe o ya fue eliminado`,
				);
			}

			if (user && !user.isSuperRoot) {
				const userCompanyId = await this.getUserCompanyId(user);
				if (!userCompanyId || existingSupplier.company?.id !== userCompanyId) {
					throw new ForbiddenException('No tienes permisos para eliminar proveedores de otra compañía');
				}
			}

			// Validar si tiene operaciones asociadas (órdenes de compra)
			const hasOrders = await this.dataSource
				.query(
					`SELECT 1 FROM sys.purchase_orders WHERE supplier_id = $1 AND deleted_at IS NULL LIMIT 1`,
					[id],
				)
				.catch(() => []);

			if (hasOrders && hasOrders.length > 0) {
				throw new BadRequestException(
					'No es posible eliminar el proveedor porque registra órdenes de compra asociadas. Puede inactivarlo en su lugar cambiando su estado.',
				);
			}

			// Validar si tiene recepciones de mercancía
			const hasReceptions = await this.dataSource
				.query(
					`SELECT 1 FROM sys.supplier_receptions WHERE supplier_id = $1 LIMIT 1`,
					[id],
				)
				.catch(() => []);

			if (hasReceptions && hasReceptions.length > 0) {
				throw new BadRequestException(
					'No es posible eliminar el proveedor porque registra recepciones de mercancía históricas. Puede inactivarlo en su lugar cambiando su estado.',
				);
			}

			// Eliminar el proveedor (soft delete y marcar inactivo)
			existingSupplier.status = StatusEnum.DESACTIVE;
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
			if (error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al eliminar el proveedor');
		}
	}
}
