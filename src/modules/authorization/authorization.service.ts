import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { IsNull, Repository, In, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { processTransaction } from '../../database/transactions';
import { CreatePermissionDto } from './dtos/permissions/create-permission';
import { UpdatePermissionDto } from './dtos/permissions/update-permission';
import { DeletePermissionDto } from './dtos/permissions/delete-permission';
import { CreateRoleDto } from './dtos/roles/create-role';
import { UpdateRoleDto } from './dtos/roles/update-role';
import { DeleteRoleDto } from './dtos/roles/delete-role';
import { StatusEnum } from 'src/core/status.enum';
import type { Request } from 'express';
import { RequestUser } from 'src/types/global';
import { User } from 'src/core/users/user.entity';
import { UserRole } from './entities/user-role.entity';
import { MyPermissionResolverService } from '../auth/authorization-guard/my-permission-resolver.service';
import { UserCompanyMembership } from '../users/entities/user-company-membership.entity';

@Injectable()
export class AuthorizationService {
	constructor(
		@InjectRepository(Permission)
		private readonly permissionRepository: Repository<Permission>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
		@InjectRepository(RolePermission)
		private readonly rolePermissionRepository: Repository<RolePermission>,
		private readonly dataSource: DataSource,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(UserRole)
		private readonly userRoleRepository: Repository<UserRole>,
		@InjectRepository(UserCompanyMembership)
		private readonly userCompanyMembershipRepository: Repository<UserCompanyMembership>,
		private readonly permissionResolver: MyPermissionResolverService,
	) {}

	async getAllRolesAndPermissionsByUserId(
		req: Request & { user: RequestUser },
	) {
		try {
			const { userId } = req.user;

			const user = await this.userRepository.findOne({ where: { id: userId } });
			if (!user) throw new UnauthorizedException('Usuario no encontrado');

			// Obtener el rol activo del usuario (siempre tiene uno a la vez)
			const userRole = await this.userRoleRepository.findOne({
				where: {
					userId,
					status: StatusEnum.ACTIVE,
					deletedAt: IsNull(),
				},
				relations: ['role'],
			});

			if (!userRole || !userRole.role) {
				return {
					ok: true,
					message: 'Roles y permisos obtenidos correctamente',
					data: { result: null },
				};
			}

			const role = userRole.role;

			// Obtener solo permisos activos para el rol
			const rolePermissions = await this.rolePermissionRepository.find({
				where: {
					roleId: role.id,
					status: StatusEnum.ACTIVE,
					deletedAt: IsNull(),
				},
				relations: ['permission'],
			});

			// Filtrar solo permisos activos y extraer nombres
			const permissions = rolePermissions
				.filter(
					(rp) =>
						rp.permission?.status === StatusEnum.ACTIVE &&
						rp.permission?.deletedAt === null,
				)
				.map((rp) => rp.permission?.name)
				.filter((name) => name !== undefined && name !== null);

			// Retornar el rol con la propiedad permissions, similar a getAllRolesAdmin
			const roleWithPermissions = {
				...role,
				permissions,
			};

			return {
				ok: true,
				message: 'Roles y permisos obtenidos correctamente',
				data: { result: roleWithPermissions },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener los roles y permisos del usuario',
			);
		}
	}

	async getAllPermissionsAdmin() {
		try {
			const permissions = await this.permissionRepository.find({
				withDeleted: true,
			});

			return {
				ok: true,
				message: 'Permisos obtenidos correctamente',
				data: { result: permissions },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener los permisos');
		}
	}

	// Permission
	async getAllPermissions() {
		try {
			const permissions = await this.permissionRepository.find({
				where: {
					status: StatusEnum.ACTIVE,
					deletedAt: IsNull(),
				},
			});

			return {
				ok: true,
				message: 'Permisos obtenidos correctamente',
				data: { result: permissions },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener los permisos');
		}
	}

	async getPermissionById(id: number) {
		try {
			const permission = await this.permissionRepository.findOne({
				where: { id, status: StatusEnum.ACTIVE, deletedAt: IsNull() },
			});

			if (!permission) {
				throw new BadRequestException(
					`El permiso ${id} no existe o esta desactivado`,
				);
			}

			return {
				ok: true,
				message: 'Permiso obtenido correctamente',
				data: { result: permission },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener el permiso');
		}
	}

	async createPermission(dto: CreatePermissionDto) {
		try {
			const { name, description } = dto;

			// verificar si la permission ya existe
			const existingPermission = await this.permissionRepository.findOne({
				where: { name },
			});

			if (existingPermission) {
				throw new BadRequestException(`La permiso ${name} ya existe`);
			}

			// crear la permission
			const newPermission = this.permissionRepository.create({
				name,
				description,
				updatedAt: new Date(),
			});
			await this.permissionRepository.save(newPermission);

			return {
				ok: true,
				message: 'Permiso creado correctamente',
				data: {
					result: newPermission,
				},
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al crear la permission');
		}
	}

	async updatePermission(dto: UpdatePermissionDto) {
		try {
			const { id, name, description, status } = dto;

			// verificar si la permission existe
			const existingPermission = await this.permissionRepository.findOne({
				where: { id },
				withDeleted: true,
			});

			if (!existingPermission) {
				throw new BadRequestException(`El permiso ${id} no existe`);
			}

			// Verificar si el nombre cambio, y si cambios verificar si ya existe otro permiso con el mismo nombre
			if (name && name !== existingPermission.name) {
				const existingPermissionWithSameName =
					await this.permissionRepository.findOne({
						where: { name },
						withDeleted: true,
					});
				if (existingPermissionWithSameName) {
					throw new BadRequestException(`El nombre ${name} ya existe`);
				}
			}

			existingPermission.name = name ?? existingPermission.name;
			existingPermission.description =
				description ?? existingPermission.description;
			existingPermission.updatedAt = new Date();

			if (status && status !== existingPermission.status) {
				existingPermission.status = status;
				existingPermission.updatedAt = new Date();

				if (status === StatusEnum.DESACTIVE) {
					existingPermission.deletedAt = new Date();
				} else {
					existingPermission.deletedAt = null;
				}
			}

			await this.permissionRepository.save(existingPermission);

			return {
				ok: true,
				message: 'Permiso actualizado correctamente',
				data: {
					result: existingPermission,
				},
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al actualizar la permission',
			);
		}
	}

	async deletePermission(dto: DeletePermissionDto) {
		try {
			const { id } = dto;

			// verificar si la permission existe
			const existingPermission = await this.permissionRepository.findOne({
				where: { id },
			});

			if (!existingPermission) {
				throw new BadRequestException(`El permiso ${id} no existe`);
			}

			// ejecutar transacción para eliminar permission y sus relaciones
			const result = await processTransaction(
				this.dataSource,
				async (queryRunner) => {
					// eliminar todas las relaciones role-permission que usen este permiso
					await queryRunner.manager.delete(RolePermission, {
						permissionId: id,
					});

					// eliminar la permission (soft delete)
					existingPermission.deletedAt = new Date();
					existingPermission.updatedAt = new Date();
					existingPermission.status = StatusEnum.DESACTIVE;

					const deletedPermission = await queryRunner.manager.save(
						Permission,
						existingPermission,
					);

					return deletedPermission;
				},
			);

			return {
				ok: true,
				message: 'Permiso eliminado correctamente',
				data: {
					result,
				},
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al eliminar la permission');
		}
	}

	async getAllRolesAdmin() {
		try {
			const roles = await this.roleRepository.find({
				withDeleted: true,
				relations: ['company'],
				select: {
					company: {
						name: true,
					},
				},
			});

			// Obtener todos los permisos para cada rol (incluyendo desactivados)
			const rolesWithPermissions = await Promise.all(
				roles.map(async (role) => {
					// Usar QueryBuilder para incluir permisos desactivados
					const rolePermissions = await this.rolePermissionRepository
						.createQueryBuilder('rp')
						.withDeleted()
						.leftJoinAndSelect('rp.permission', 'permission')
						.where('rp.roleId = :roleId', { roleId: role.id })
						.getMany();

					const permissions = rolePermissions
						.map((rp) => rp.permission?.name)
						.filter((name) => name !== undefined && name !== null);

					return {
						...role,
						permissions,
					};
				}),
			);

			return {
				ok: true,
				message: 'Roles obtenidos correctamente',
				data: { result: rolesWithPermissions },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener los roles');
		}
	}

	// Role
	async getAllRoles(id_company: number) {
		try {
			const roles = await this.roleRepository.find({
				where: {
					companyId: id_company,
					status: StatusEnum.ACTIVE,
					deletedAt: IsNull(),
				},
			});

			// Obtener solo permisos activos para cada rol
			const rolesWithPermissions = await Promise.all(
				roles.map(async (role) => {
					const rolePermissions = await this.rolePermissionRepository.find({
						where: {
							roleId: role.id,
							status: StatusEnum.ACTIVE,
							deletedAt: IsNull(),
						},
						relations: ['permission'],
					});

					// Filtrar solo permisos activos
					const permissions = rolePermissions
						.filter(
							(rp) =>
								rp.permission?.status === StatusEnum.ACTIVE &&
								rp.permission?.deletedAt === null,
						)
						.map((rp) => rp.permission?.name)
						.filter((name) => name !== undefined && name !== null);

					return {
						...role,
						permissions,
					};
				}),
			);

			return {
				ok: true,
				message: 'Roles obtenidos correctamente',
				data: { result: rolesWithPermissions },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener los roles');
		}
	}

	async getAllRolesWithPermissions(id_company: number) {
		try {
			const roles = await this.roleRepository.find({
				where: {
					companyId: id_company,
					status: StatusEnum.ACTIVE,
					deletedAt: IsNull(),
				},
				relations: ['company', 'permissions'],
			});

			return {
				ok: true,
				message: 'Roles con permisos obtenidos correctamente',
				data: { result: roles },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener los roles con permisos',
			);
		}
	}

	async getRoleById(id: number) {
		try {
			const role = await this.roleRepository.findOne({
				where: { id, status: StatusEnum.ACTIVE, deletedAt: IsNull() },
				relations: ['company'],
			});

			if (!role) {
				throw new BadRequestException(
					`El rol ${id} no existe o esta desactivado`,
				);
			}

			return {
				ok: true,
				message: 'Rol obtenido correctamente',
				data: { result: role },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener el rol');
		}
	}

	async createRole(dto: CreateRoleDto) {
		try {
			const { companyId, name, description, permissions } = dto;

			// verificar si el rol ya existe para esta empresa
			const existingRole = await this.roleRepository.findOne({
				where: { companyId, name },
			});

			if (existingRole) {
				throw new BadRequestException(
					`El rol ${name} ya existe para esta empresa`,
				);
			}

			// si se proporcionan permisos, verificar que todos existan
			if (permissions && permissions.length > 0) {
				const existingPermissions = await this.permissionRepository.find({
					where: {
						id: In(permissions),
						status: StatusEnum.ACTIVE,
						deletedAt: IsNull(),
					},
				});

				if (existingPermissions.length !== permissions.length) {
					throw new BadRequestException(
						'Algunos permisos no existen o están desactivados',
					);
				}
			}

			// ejecutar transacción para crear rol y permisos
			const result = await processTransaction(
				this.dataSource,
				async (queryRunner) => {
					// crear el rol
					const newRole = queryRunner.manager.create(Role, {
						companyId,
						name,
						description,
						updatedAt: new Date(),
					});
					const savedRole = await queryRunner.manager.save(Role, newRole);

					// si se proporcionan permisos, crear las relaciones
					if (permissions && permissions.length > 0) {
						const rolePermissions = permissions.map((permissionId) =>
							queryRunner.manager.create(RolePermission, {
								roleId: savedRole.id,
								permissionId,
							}),
						);

						await queryRunner.manager.save(RolePermission, rolePermissions);
					}

					return savedRole;
				},
			);

			return {
				ok: true,
				message: 'Rol creado correctamente',
				data: {
					result,
				},
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al crear el rol');
		}
	}

	async updateRole(dto: UpdateRoleDto) {
		try {
			const { id, companyId, name, description, status, permissions } = dto;

			// verificar si el rol existe
			const existingRole = await this.roleRepository.findOne({
				where: { id },
				withDeleted: true,
			});

			if (!existingRole) {
				throw new BadRequestException(`El rol ${id} no existe`);
			}

			// Verificar si el nombre cambio, y si cambios verificar si ya existe otro rol con el mismo nombre para la empresa
			if (name && name !== existingRole.name) {
				const existingRoleWithSameName = await this.roleRepository.findOne({
					where: { companyId: companyId || existingRole.companyId, name },
					withDeleted: true,
				});
				if (existingRoleWithSameName) {
					throw new BadRequestException(
						`El nombre ${name} ya existe para esta empresa`,
					);
				}
			}

			// si se proporcionan permisos, verificar que todos existan
			if (permissions !== undefined && permissions.length > 0) {
				const existingPermissions = await this.permissionRepository.find({
					where: {
						id: In(permissions),
						status: StatusEnum.ACTIVE,
						deletedAt: IsNull(),
					},
				});

				if (existingPermissions.length !== permissions.length) {
					throw new BadRequestException(
						'Algunos permisos no existen o están desactivados',
					);
				}
			}

			// ejecutar transacción para actualizar rol y permisos
			const result = await processTransaction(
				this.dataSource,
				async (queryRunner) => {
					// actualizar el rol
					existingRole.companyId = companyId ?? existingRole.companyId;
					existingRole.name = name ?? existingRole.name;
					existingRole.description = description ?? existingRole.description;
					existingRole.updatedAt = new Date();

					if (status && status !== existingRole.status) {
						existingRole.status = status;
						existingRole.updatedAt = new Date();

						if (status === StatusEnum.DESACTIVE) {
							existingRole.deletedAt = new Date();
						} else {
							existingRole.deletedAt = null;
						}
					}

					const updatedRole = await queryRunner.manager.save(
						Role,
						existingRole,
					);

					// si se proporcionan permisos, actualizar las relaciones
					if (permissions !== undefined) {
						// eliminar todas las relaciones existentes del rol
						await queryRunner.manager.delete(RolePermission, { roleId: id });

						// si se proporcionan permisos, crear las nuevas relaciones
						if (permissions.length > 0) {
							const rolePermissions = permissions.map((permissionId) =>
								queryRunner.manager.create(RolePermission, {
									roleId: id,
									permissionId,
								}),
							);

							await queryRunner.manager.save(RolePermission, rolePermissions);
						}
					}

					return updatedRole;
				},
			);

			// Invalidar cache de todos los usuarios que tienen este rol
			try {
				// Obtener todos los UserRoles que tienen este roleId (incluyendo eliminados)
				// para cubrir todos los casos posibles
				const userRolesWithThisRole = await this.userRoleRepository.find({
					where: { roleId: id },
					withDeleted: true,
				});
				// Invalidar el cache de cada usuario que tiene este rol
				await Promise.all(
					userRolesWithThisRole.map(async (userRole) => {
						await this.permissionResolver.invalidate(userRole.userId, null);
					}),
				);
			} catch (cacheError) {
				// Si hay error al invalidar el cache, no es crítico, solo loguear
				// La actualización del rol ya fue exitosa
				console.warn(
					`Error al invalidar cache de usuarios con rol ${id}:`,
					cacheError,
				);
			}

			return {
				ok: true,
				message: 'Rol actualizado correctamente',
				data: {
					result,
				},
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al actualizar el rol');
		}
	}

	async deleteRole(dto: DeleteRoleDto) {
		try {
			const { id } = dto;

			// verificar si el rol existe
			const existingRole = await this.roleRepository.findOne({
				where: { id },
			});

			if (!existingRole) {
				throw new BadRequestException(`El rol ${id} no existe`);
			}

			// ejecutar transacción para eliminar rol y sus relaciones
			const result = await processTransaction(
				this.dataSource,
				async (queryRunner) => {
					// eliminar todas las relaciones role-permission del rol
					await queryRunner.manager.delete(RolePermission, { roleId: id });

					// eliminar el rol (soft delete)
					existingRole.deletedAt = new Date();
					existingRole.updatedAt = new Date();
					existingRole.status = StatusEnum.DESACTIVE;

					const deletedRole = await queryRunner.manager.save(
						Role,
						existingRole,
					);

					return deletedRole;
				},
			);

			return {
				ok: true,
				message: 'Rol eliminado correctamente',
				data: {
					result,
				},
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al eliminar el rol');
		}
	}

	// --- Store Methods ---

	async getStoreRoles(userId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		return await this.getAllRoles(membership.companyId);
	}

	async getStoreRoleById(id: number, userId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		const role = await this.roleRepository.findOne({
			where: { id, companyId: membership.companyId, status: StatusEnum.ACTIVE },
			relations: ['company'],
		});

		if (!role) {
			throw new UnauthorizedException('No tienes permisos para ver este rol');
		}

		return {
			ok: true,
			message: 'Rol obtenido correctamente',
			data: { result: role },
		};
	}

	async createStoreRole(dto: CreateRoleDto, userId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		// Forzar companyId
		dto.companyId = membership.companyId;

		return await this.createRole(dto);
	}

	async updateStoreRole(dto: UpdateRoleDto, userId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		// Validar que el rol pertenece a la compañía
		const existingRole = await this.roleRepository.findOne({
			where: { id: dto.id, companyId: membership.companyId },
		});

		if (!existingRole) {
			throw new UnauthorizedException(
				'No tienes permisos para actualizar este rol',
			);
		}

		// Forzar companyId
		dto.companyId = membership.companyId;

		return await this.updateRole(dto);
	}

	async deleteStoreRole(dto: DeleteRoleDto, userId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		// Validar que el rol pertenece a la compañía
		const existingRole = await this.roleRepository.findOne({
			where: { id: dto.id, companyId: membership.companyId },
		});

		if (!existingRole) {
			throw new UnauthorizedException(
				'No tienes permisos para eliminar este rol',
			);
		}

		return await this.deleteRole(dto);
	}
}
