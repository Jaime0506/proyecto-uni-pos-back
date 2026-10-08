import {
	Injectable,
	BadRequestException,
	ForbiddenException,
	InternalServerErrorException,
	UnauthorizedException,
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
import { RequestUser } from 'src/types/global';
import { MyPermissionResolverService } from '../auth/authorization-guard/my-permission-resolver.service';

@Injectable()
export class StoresService {
	constructor(
		@InjectRepository(Store)
		private readonly storeRepository: Repository<Store>,
		@InjectRepository(Company)
		private readonly companyRepository: Repository<Company>,
		@InjectRepository(UserCompanyMembership)
		private readonly userCompanyMembershipRepository: Repository<UserCompanyMembership>,
		private readonly permissionResolver: MyPermissionResolverService,
	) {}

	/**
	 * Verifica si el usuario cuenta con permisos administrativos globales sobre tiendas
	 * (o si es super root) para operar sobre todas las compañías.
	 */
	private async isGlobalStoreAdmin(
		user: RequestUser,
		action: 'read' | 'create' | 'update' | 'delete' = 'read',
	): Promise<boolean> {
		if (user.isSuperRoot) return true;

		const tenantId = user.companyId ? user.companyId.toString() : null;
		const permissions = await this.permissionResolver.getUserPermissions(
			user.userId,
			tenantId,
		);

		return (
			permissions.has(`store_admin:${action}`) ||
			permissions.has('store_admin:*') ||
			permissions.has('*')
		);
	}

	/**
	 * Obtiene el ID de la compañía asociada al usuario.
	 */
	private async getUserCompanyId(user: RequestUser): Promise<number | null> {
		if (user.companyId) {
			return user.companyId;
		}
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: user.userId, isActive: true },
		});
		return membership ? membership.companyId : null;
	}

	// Obtener tiendas de la compañía del usuario autenticado (activas)
	async getCompanyStores(user: RequestUser) {
		try {
			const companyId = await this.getUserCompanyId(user);

			if (!companyId) {
				return {
					ok: true,
					message: 'El usuario no tiene una compañía asignada',
					data: { result: [] },
				};
			}

			const stores = await this.storeRepository.find({
				where: {
					company: { id: companyId },
					status: StatusEnum.ACTIVE,
				},
				withDeleted: false,
				order: { id: 'ASC' },
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

	// Obtener todas las tiendas (respetando aislamiento por compañía salvo que sea admin global)
	async getAllStores(user: RequestUser) {
		try {
			const isGlobalAdmin = await this.isGlobalStoreAdmin(user, 'read');

			if (isGlobalAdmin) {
				const stores = await this.storeRepository.find({
					withDeleted: true,
					relations: ['company'],
					order: { id: 'DESC' },
				});

				return {
					ok: true,
					message: 'Tiendas obtenidas correctamente (Vista Global)',
					data: { result: stores },
				};
			}

			// Usuario con permiso de compañía (store:read): restringir estrictamente a su empresa
			const companyId = await this.getUserCompanyId(user);

			if (!companyId) {
				return {
					ok: true,
					message: 'El usuario no tiene una compañía asignada',
					data: { result: [] },
				};
			}

			const stores = await this.storeRepository.find({
				where: {
					company: { id: companyId },
				},
				withDeleted: true,
				relations: ['company'],
				order: { id: 'DESC' },
			});

			return {
				ok: true,
				message: 'Tiendas de la compañía obtenidas correctamente',
				data: { result: stores },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener las tiendas');
		}
	}

	// Crear una nueva tienda
	async createStore(dto: CreateStoreDto, user: RequestUser) {
		try {
			const isGlobalAdmin = await this.isGlobalStoreAdmin(user, 'create');
			let targetCompanyId = dto.companyId;

			if (!isGlobalAdmin) {
				const userCompanyId = await this.getUserCompanyId(user);
				if (!userCompanyId) {
					throw new UnauthorizedException(
						'El usuario no tiene una compañía asignada',
					);
				}

				// Si el usuario no es admin global, se restringe forzosamente a su empresa
				if (targetCompanyId && targetCompanyId !== userCompanyId) {
					throw new ForbiddenException(
						'No tiene permisos para crear tiendas en otra compañía',
					);
				}

				targetCompanyId = userCompanyId;
			}

			if (!targetCompanyId) {
				throw new BadRequestException('El ID de la compañía es obligatorio');
			}

			const { name, nit, address, phone, email, ivaPercentage } = dto;

			// Verificar si la compañía existe
			const company = await this.companyRepository.findOne({
				where: { id: targetCompanyId },
				withDeleted: false,
			});

			if (!company) {
				throw new BadRequestException(
					`La compañía con ID ${targetCompanyId} no existe o está desactivada`,
				);
			}

			// Verificar el límite de tiendas de la compañía
			const activeStoresCount = await this.storeRepository.count({
				where: {
					company: { id: targetCompanyId },
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
			newStore.ivaPercentage =
				ivaPercentage !== undefined && ivaPercentage !== null
					? Number(ivaPercentage)
					: 19.0;

			const savedStore = await this.storeRepository.save(newStore);

			return {
				ok: true,
				message: 'Tienda creada correctamente',
				data: { result: savedStore },
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof ForbiddenException ||
				error instanceof UnauthorizedException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al crear la tienda');
		}
	}

	// Actualizar una tienda
	async updateStore(dto: UpdateStoreDto, user: RequestUser) {
		try {
			const {
				id,
				companyId,
				name,
				nit,
				address,
				phone,
				email,
				status,
				ivaPercentage,
			} = dto;

			// Verificar si la tienda existe
			const existingStore = await this.storeRepository.findOne({
				where: { id },
				relations: ['company'],
				withDeleted: true,
			});

			if (!existingStore) {
				throw new BadRequestException(`La tienda ${id} no existe`);
			}

			const isGlobalAdmin = await this.isGlobalStoreAdmin(user, 'update');

			if (!isGlobalAdmin) {
				const userCompanyId = await this.getUserCompanyId(user);
				if (!userCompanyId || existingStore.company?.id !== userCompanyId) {
					throw new ForbiddenException(
						'No tiene permisos para modificar tiendas de otra compañía',
					);
				}

				if (companyId && companyId !== existingStore.company.id) {
					throw new ForbiddenException(
						'No tiene permisos para reasignar la tienda a otra compañía',
					);
				}
			}

			// Si se proporciona un companyId diferente (solo permitido a administradores globales)
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
			if (ivaPercentage !== undefined && ivaPercentage !== null) {
				existingStore.ivaPercentage = Number(ivaPercentage);
			}
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
			if (
				error instanceof BadRequestException ||
				error instanceof ForbiddenException ||
				error instanceof UnauthorizedException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al actualizar la tienda');
		}
	}

	// Eliminar una tienda (soft delete)
	async deleteStore(dto: DeleteStoreDto, user: RequestUser) {
		try {
			const { id } = dto;

			// Verificar si la tienda existe
			const existingStore = await this.storeRepository.findOne({
				where: { id },
				relations: ['company'],
				withDeleted: false,
			});

			if (!existingStore) {
				throw new BadRequestException(`La tienda ${id} no existe`);
			}

			const isGlobalAdmin = await this.isGlobalStoreAdmin(user, 'delete');

			if (!isGlobalAdmin) {
				const userCompanyId = await this.getUserCompanyId(user);
				if (!userCompanyId || existingStore.company?.id !== userCompanyId) {
					throw new ForbiddenException(
						'No tiene permisos para eliminar tiendas de otra compañía',
					);
				}
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
			if (
				error instanceof BadRequestException ||
				error instanceof ForbiddenException ||
				error instanceof UnauthorizedException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al eliminar la tienda');
		}
	}
}
