import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
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
	) {}

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
			const { id, name, description } = dto;

			// verificar si la permission existe
			const existingPermission = await this.permissionRepository.findOne({
				where: { id },
			});

			if (!existingPermission) {
				throw new BadRequestException(`El permiso ${id} no existe`);
			}

			// Verificar si el nombre cambio, y si cambios verificar si ya existe otro permiso con el mismo nombre
			if (name && name !== existingPermission.name) {
				const existingPermissionWithSameName =
					await this.permissionRepository.findOne({
						where: { name },
					});
				if (existingPermissionWithSameName) {
					throw new BadRequestException(`El nombre ${name} ya existe`);
				}
			}

			existingPermission.name = name ?? existingPermission.name;
			existingPermission.description =
				description ?? existingPermission.description;
			existingPermission.updatedAt = new Date();

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

			return {
				ok: true,
				message: 'Roles obtenidos correctamente',
				data: { result: roles },
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
			});

			if (!existingRole) {
				throw new BadRequestException(`El rol ${id} no existe`);
			}

			// Verificar si el nombre cambio, y si cambios verificar si ya existe otro rol con el mismo nombre para la empresa
			if (name && name !== existingRole.name) {
				const existingRoleWithSameName = await this.roleRepository.findOne({
					where: { companyId: companyId || existingRole.companyId, name },
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
					existingRole.status = status ?? existingRole.status;
					existingRole.updatedAt = new Date();

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
}
