import {
	Injectable,
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateStoreDto } from './dtos/create-store.dto';
import { UpdateStoreDto } from './dtos/update-store.dto';
import { DeleteStoreDto } from './dtos/delete-store.dto';
import { StatusEnum } from 'src/core/status.enum';

import { UserCompanyMembership } from '../users/entities/user-company-membership.entity';

@Injectable()
export class StoresService {
	constructor(
		@InjectRepository(Store)
		private readonly storeRepository: Repository<Store>,
		@InjectRepository(Company)
		private readonly companyRepository: Repository<Company>,
		@InjectRepository(UserCompanyMembership)
		private readonly userCompanyMembershipRepository: Repository<UserCompanyMembership>,
	) {}

	// Obtener tiendas de la compañía del usuario autenticado (activas)
	async getCompanyStores(userId: string) {
		try {
			const membership = await this.userCompanyMembershipRepository.findOne({
				where: { userId, isActive: true },
			});

			if (!membership) {
				return {
					ok: true,
					message: 'El usuario no tiene una compañía asignada',
					data: { result: [] },
				};
			}

			const stores = await this.storeRepository.find({
				where: {
					company: { id: membership.companyId },
					status: StatusEnum.ACTIVE,
				},
				withDeleted: false,
			});

			return {
				ok: true,
				message: 'Tiendas de la compañía obtenidas correctamente',
				data: { result: stores },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener las tiendas de la compañía',
			);
		}
	}

	// Obtener todas las tiendas (incluyendo desactivadas)
	async getAllStores() {
		try {
			const stores = await this.storeRepository.find({
				withDeleted: true,
				relations: ['company'],
			});

			return {
				ok: true,
				message: 'Tiendas obtenidas correctamente',
				data: { result: stores },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener las tiendas');
		}
	}

	// Crear una nueva tienda
	async createStore(dto: CreateStoreDto) {
		try {
			const { companyId, name, nit, address, phone, email } = dto;

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

			// Verificar el límite de tiendas de la compañía
			const activeStoresCount = await this.storeRepository.count({
				where: {
					company: { id: companyId },
					status: StatusEnum.ACTIVE,
				},
				withDeleted: false,
			});

			if (activeStoresCount >= company.maxStores) {
				throw new BadRequestException(
					`La compañía ha alcanzado el límite de ${company.maxStores} tienda(s) activa(s)`,
				);
			}

			// Crear la tienda
			const newStore = new Store();
			newStore.company = company;
			newStore.name = name;
			if (nit !== undefined) newStore.nit = nit?.trim() ? nit.trim() : null;
			if (address !== undefined) newStore.address = address;
			if (phone !== undefined) newStore.phone = phone;
			if (email !== undefined) newStore.email = email;

			const savedStore = await this.storeRepository.save(newStore);

			return {
				ok: true,
				message: 'Tienda creada correctamente',
				data: { result: savedStore },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al crear la tienda');
		}
	}

	// Actualizar una tienda
	async updateStore(dto: UpdateStoreDto) {
		try {
			const { id, companyId, name, nit, address, phone, email, status } = dto;

			// Verificar si la tienda existe
			const existingStore = await this.storeRepository.findOne({
				where: { id },
				relations: ['company'],
				withDeleted: true,
			});

			if (!existingStore) {
				throw new BadRequestException(`La tienda ${id} no existe`);
			}

			// Si se proporciona un companyId diferente, verificar que la nueva compañía exista
			if (companyId && companyId !== existingStore.company.id) {
				const newCompany = await this.companyRepository.findOne({
					where: { id: companyId },
					withDeleted: false,
				});

				if (!newCompany) {
					throw new BadRequestException(
						`La compañía con ID ${companyId} no existe o está desactivada`,
					);
				}

				// Verificar el límite de tiendas de la nueva compañía
				const activeStoresCount = await this.storeRepository.count({
					where: {
						company: { id: companyId },
						status: StatusEnum.ACTIVE,
					},
					withDeleted: false,
				});

				if (
					activeStoresCount >= newCompany.maxStores &&
					(status === undefined || status === StatusEnum.ACTIVE)
				) {
					throw new BadRequestException(
						`La compañía ha alcanzado el límite de ${newCompany.maxStores} tienda(s) activa(s)`,
					);
				}

				existingStore.company = newCompany;
			}

			// Actualizar campos
			if (name !== undefined) existingStore.name = name;
			if (nit !== undefined)
				existingStore.nit = nit?.trim() ? nit.trim() : null;
			if (address !== undefined) existingStore.address = address;
			if (phone !== undefined) existingStore.phone = phone;
			if (email !== undefined) existingStore.email = email;
			existingStore.updatedAt = new Date();

			// Manejar cambio de estado
			if (status && status !== existingStore.status) {
				existingStore.status = status;
				existingStore.updatedAt = new Date();

				if (status === StatusEnum.DESACTIVE) {
					existingStore.deletedAt = new Date();
				} else {
					existingStore.deletedAt = null;
				}
			}

			const updatedStore = await this.storeRepository.save(existingStore);

			return {
				ok: true,
				message: 'Tienda actualizada correctamente',
				data: { result: updatedStore },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al actualizar la tienda');
		}
	}

	// Eliminar una tienda (soft delete)
	async deleteStore(dto: DeleteStoreDto) {
		try {
			const { id } = dto;

			// Verificar si la tienda existe
			const existingStore = await this.storeRepository.findOne({
				where: { id },
				withDeleted: false,
			});

			if (!existingStore) {
				throw new BadRequestException(`La tienda ${id} no existe`);
			}

			// Eliminar la tienda (soft delete)
			existingStore.deletedAt = new Date();
			existingStore.updatedAt = new Date();
			existingStore.status = StatusEnum.DESACTIVE;

			const deletedStore = await this.storeRepository.save(existingStore);

			return {
				ok: true,
				message: 'Tienda eliminada correctamente',
				data: { result: deletedStore },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al eliminar la tienda');
		}
	}
}
