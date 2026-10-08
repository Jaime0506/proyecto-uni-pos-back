import {
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
	BadRequestException,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/core/users/user.entity';
import { UpdateDto } from './dtos/update.dto';
import { Repository, DataSource } from 'typeorm';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { compareSync } from 'bcrypt';
import { hashPassword, createUserName } from 'src/utils/auth.utilities';
import { DeleteDto } from './dtos/delete.dto';
import { ActivateUserDto } from './dtos/activate-user.dto';
import { CreateUserWithRoleDto } from './dtos/create-user-with-role.dto';
import { UpdateUserWithRoleDto } from './dtos/update-user-with-role.dto';
import { UserRole } from 'src/modules/authorization/entities/user-role.entity';
import { Role } from 'src/modules/authorization/entities/role.entity';
import { StatusEnum } from 'src/core/status.enum';
import { processTransaction } from 'src/database/transactions';
import { UserCompanyMembership } from './entities/user-company-membership.entity';
import { Company } from '../companies/entities/company.entity';
import { Store } from '../stores/entities/store.entity';
import { UserStore } from './entities/user-store.entity';
import { RolePermission } from '../authorization/entities/role-permission.entity';
import { AuditService } from '../audit/audit.service';
import { IsNull } from 'typeorm';
import {
	CreateStoreEmployeeDto,
	UpdateStoreEmployeeDto,
	StoreUserActionDto,
} from './dtos/by-store-user.dto';
import { AdminResetPasswordDto } from './dtos/admin-reset-password.dto';
import { RequestUser } from 'src/types/global';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User) private readonly users: Repository<User>,
		@InjectRepository(UserRole)
		private readonly userRoleRepository: Repository<UserRole>,
		@InjectRepository(UserCompanyMembership)
		private readonly userCompanyMembershipRepository: Repository<UserCompanyMembership>,
		@InjectRepository(Company)
		private readonly companyRepository: Repository<Company>,
		@InjectRepository(Store)
		private readonly storeRepository: Repository<Store>,
		@InjectRepository(UserStore)
		private readonly userStoreRepository: Repository<UserStore>,
		private readonly dataSource: DataSource,
		private readonly auditService: AuditService,
	) {}

	async update(userId: string, dto: UpdateDto) {
		// Solo puedo actualizar mi propio usuario en este metodo
		if (dto.id_user !== userId)
			throw new UnauthorizedException('No puedes actualizar este usuario');

		// En user id viene el id del usuario logueado
		// en el dto.id_user viene el id del usuario a actualizar
		const user = await this.users.findOne({ where: { id: userId } });

		if (!user) throw new UnauthorizedException('Usuario no encontrado');

		const { firstName, lastName, email, nationalId, phoneNumber } = dto;

		user.firstName = firstName ?? user.firstName;
		user.lastName = lastName ?? user.lastName;
		user.email = email ?? user.email;
		user.nationalId = nationalId ?? user.nationalId;
		user.phoneNumber = phoneNumber ?? user.phoneNumber;

		await this.users.save(user);

		return {
			ok: true,
			message: 'Usuario actualizado correctamente',
		};
	}

	async changePassword(userId: string, dto: ChangePasswordDto) {
		const user = await this.users.findOne({ where: { id: userId } });
		if (!user) throw new UnauthorizedException('Usuario no encontrado');

		const { oldPassword, newPassword } = dto;

		const ok = compareSync(oldPassword, user.password);

		if (!ok) {
			throw new UnauthorizedException('Contraseña actual inválida');
		}

		const hashedPassword = await hashPassword(newPassword);

		user.password = hashedPassword;
		user.updatedAt = new Date();

		await this.users.save(user);

		void this.auditService.logAction({
			userId,
			module: 'AUTH',
			action: 'PASSWORD_CHANGED',
			entityName: 'User',
			entityId: userId,
			description: `Contraseña actualizada para el usuario ${user.username}`,
		});

		return {
			ok: true,
			message: 'Contraseña actualizada correctamente',
		};
	}

	async deleteUser(userId: string, dto: DeleteDto) {
		const user = await this.users.findOne({ where: { id: userId } });
		if (!user) throw new UnauthorizedException('Usuario no encontrado');

		// Aca tendria que hacer la validacion del rol, etc cuando tenga los roles

		const userToDelete = await this.users.findOne({
			where: { id: dto.id_user },
		});

		if (!userToDelete) throw new UnauthorizedException('Usuario no encontrado');

		userToDelete.deletedAt = new Date();
		userToDelete.updatedAt = new Date();
		userToDelete.isActive = false;

		await this.users.save(userToDelete);

		return {
			ok: true,
			message: 'Usuario desactivado correctamente',
		};
	}

	async deleteUserAdmin(dto: DeleteDto) {
		const userToDelete = await this.users.findOne({
			where: { id: dto.id_user },
		});

		if (!userToDelete) throw new BadRequestException('Usuario no encontrado');

		userToDelete.deletedAt = new Date();
		userToDelete.updatedAt = new Date();
		userToDelete.isActive = false;

		await this.users.save(userToDelete);

		void this.auditService.logAction({
			userId: dto.id_user,
			module: 'USERS',
			action: 'USER_DEACTIVATED',
			entityName: 'User',
			entityId: dto.id_user,
			description: `Usuario ${userToDelete.username} (${userToDelete.firstName} ${userToDelete.lastName}) desactivado por administrador general`,
		});

		return {
			ok: true,
			message: 'Usuario desactivado correctamente',
		};
	}

	async deleteStoreUser(dto: DeleteDto, requesterId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: requesterId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		const targetMembership = await this.userCompanyMembershipRepository.findOne(
			{
				where: { userId: dto.id_user, companyId: membership.companyId },
			},
		);

		if (!targetMembership) {
			throw new UnauthorizedException(
				'No tienes permisos para desactivar este usuario o no pertenece a tu compañía',
			);
		}

		const userToDelete = await this.users.findOne({
			where: { id: dto.id_user },
		});

		if (!userToDelete) throw new BadRequestException('Usuario no encontrado');

		userToDelete.deletedAt = new Date();
		userToDelete.updatedAt = new Date();
		userToDelete.isActive = false;

		await this.users.save(userToDelete);

		void this.auditService.logAction({
			userId: dto.id_user,
			companyId: membership.companyId,
			module: 'USERS',
			action: 'USER_DEACTIVATED',
			entityName: 'User',
			entityId: dto.id_user,
			description: `Usuario ${userToDelete.username} (${userToDelete.firstName} ${userToDelete.lastName}) desactivado por administrador de empresa`,
		});

		return {
			ok: true,
			message: 'Usuario desactivado correctamente',
		};
	}

	async activateUserAdmin(dto: ActivateUserDto) {
		const user = await this.users.findOne({
			where: { id: dto.id_user },
			withDeleted: true,
		});

		if (!user) throw new BadRequestException('Usuario no encontrado');

		user.deletedAt = null;
		user.updatedAt = new Date();
		user.isActive = true;

		await this.users.save(user);

		// Reactivar membresía de compañía si estaba inactiva
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: dto.id_user },
			order: { joinedAt: 'DESC' },
		});
		if (membership && !membership.isActive) {
			membership.isActive = true;
			await this.userCompanyMembershipRepository.save(membership);
		}

		// Reactivar rol del usuario si estaba desactivado
		const userRole = await this.userRoleRepository.findOne({
			where: { userId: dto.id_user },
			order: { createdAt: 'DESC' },
			withDeleted: true,
		});
		if (userRole && userRole.status !== StatusEnum.ACTIVE) {
			userRole.status = StatusEnum.ACTIVE;
			userRole.deletedAt = null;
			userRole.updatedAt = new Date();
			await this.userRoleRepository.save(userRole);
		}

		void this.auditService.logAction({
			userId: dto.id_user,
			module: 'USERS',
			action: 'USER_ACTIVATED',
			entityName: 'User',
			entityId: dto.id_user,
			description: `Usuario ${user.username} (${user.firstName} ${user.lastName}) reactivado por administrador general`,
		});

		return {
			ok: true,
			message: 'Usuario reactivado correctamente',
			data: { result: user },
		};
	}

	async activateStoreUser(dto: ActivateUserDto, requesterId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: requesterId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		const targetMembership = await this.userCompanyMembershipRepository.findOne(
			{
				where: { userId: dto.id_user, companyId: membership.companyId },
			},
		);

		if (!targetMembership) {
			throw new UnauthorizedException(
				'No tienes permisos para reactivar este usuario o no pertenece a tu compañía',
			);
		}

		const user = await this.users.findOne({
			where: { id: dto.id_user },
			withDeleted: true,
		});

		if (!user) throw new BadRequestException('Usuario no encontrado');

		user.deletedAt = null;
		user.updatedAt = new Date();
		user.isActive = true;

		await this.users.save(user);

		targetMembership.isActive = true;
		await this.userCompanyMembershipRepository.save(targetMembership);

		// Reactivar rol del usuario si pertenece a la misma compañía
		const userRole = await this.userRoleRepository.findOne({
			where: { userId: dto.id_user, companyId: membership.companyId },
			order: { createdAt: 'DESC' },
			withDeleted: true,
		});
		if (userRole && userRole.status !== StatusEnum.ACTIVE) {
			userRole.status = StatusEnum.ACTIVE;
			userRole.deletedAt = null;
			userRole.updatedAt = new Date();
			await this.userRoleRepository.save(userRole);
		}

		void this.auditService.logAction({
			userId: dto.id_user,
			companyId: membership.companyId,
			module: 'USERS',
			action: 'USER_ACTIVATED',
			entityName: 'User',
			entityId: dto.id_user,
			description: `Usuario ${user.username} (${user.firstName} ${user.lastName}) reactivado por administrador de empresa`,
		});

		return {
			ok: true,
			message: 'Usuario reactivado correctamente',
			data: { result: user },
		};
	}

	// ========== Sección: Users - Admin Interno ==========
	async getAllUsers() {
		// Obtener todos los usuarios (incluyendo eliminados)
		const users = await this.users.find({
			select: [
				'id',
				'username',
				'email',
				'nationalId',
				'isActive',
				'phoneNumber',
				'firstName',
				'lastName',
				'createdAt',
				'updatedAt',
				'deletedAt',
			],
			withDeleted: true,
		});

		// Obtener todos los UserRoles activos con sus roles en una sola query
		const userRoles = await this.userRoleRepository.find({
			where: {
				status: StatusEnum.ACTIVE,
			},
			relations: ['role'],
			order: {
				createdAt: 'DESC',
			},
		});

		// Obtener todas las membresías activas con sus compañías
		const userMemberships = await this.userCompanyMembershipRepository.find({
			where: {
				isActive: true,
			},
			relations: ['company'],
			order: {
				joinedAt: 'DESC',
			},
		});

		// Crear un mapa de userId -> role para acceso rápido
		const userRoleMap = new Map<string, Role>();
		userRoles.forEach((userRole) => {
			// Si un usuario tiene múltiples roles, tomar el más reciente (ya ordenado por createdAt DESC)
			if (!userRoleMap.has(userRole.userId) && userRole.role) {
				userRoleMap.set(userRole.userId, userRole.role);
			}
		});

		// Crear un mapa de userId -> company para acceso rápido
		const userCompanyMap = new Map<string, Company>();
		userMemberships.forEach((membership) => {
			// Si un usuario tiene múltiples compañías, tomar la más reciente (ya ordenado por joinedAt DESC)
			if (!userCompanyMap.has(membership.userId) && membership.company) {
				userCompanyMap.set(membership.userId, membership.company);
			}
		});

		// Obtener asignaciones de tiendas para los usuarios
		const userIds = users.map((u) => u.id);
		const userStores =
			userIds.length > 0
				? await this.userStoreRepository.find({
						where: userIds.map((id) => ({ userId: id })),
						relations: ['store'],
					})
				: [];

		const userStoresMap = new Map<
			string,
			{ id: number; name: string; isActive: boolean }[]
		>();
		userStores.forEach((us) => {
			if (us.store) {
				const list = userStoresMap.get(us.userId) || [];
				list.push({
					id: us.store.id,
					name: us.store.name,
					isActive: us.isActive,
				});
				userStoresMap.set(us.userId, list);
			}
		});

		// Formatear los resultados para incluir la propiedad role, company y stores
		const usersWithRoles = users.map((user) => {
			const role = userRoleMap.get(user.id);
			const company = userCompanyMap.get(user.id);

			const userWithRole = {
				...user,
				role: role
					? {
							id: role.id,
							companyId: role.companyId,
							name: role.name,
						}
					: null,
				company: company
					? {
							id: company.id,
							name: company.name,
						}
					: null,
				stores: userStoresMap.get(user.id) || [],
			};

			return userWithRole;
		});

		return {
			ok: true,
			message: 'Usuarios obtenidos correctamente',
			data: { result: usersWithRoles },
		};
	}

	async getUserById(id: string) {
		const user = await this.users.findOne({ where: { id }, withDeleted: true });
		if (!user) throw new UnauthorizedException('Usuario no encontrado');

		return {
			ok: true,
			message: 'Usuario obtenido correctamente',
			data: { result: user },
		};
	}

	// Helper: Determina si el usuario tiene permiso store:access_all o rol de administración
	async userHasStoreAccessAll(
		userId: string,
		companyId?: number,
	): Promise<boolean> {
		const user = await this.users.findOne({ where: { id: userId } });
		if (user?.isSuperRoot) return true;

		const userRole = await this.userRoleRepository.findOne({
			where: {
				userId,
				status: StatusEnum.ACTIVE,
				deletedAt: IsNull(),
				...(companyId ? { companyId } : {}),
			},
			relations: ['role'],
			order: { createdAt: 'DESC' },
		});

		if (!userRole || !userRole.role) return false;

		// Si el nombre del rol es administrador o super, tiene acceso global
		const roleNameLower = userRole.role.name.toLowerCase();
		if (roleNameLower.includes('admin') || roleNameLower.includes('super')) {
			return true;
		}

		// Verificar si tiene el permiso store:access_all
		const hasAll = await this.dataSource.getRepository(RolePermission).findOne({
			where: {
				roleId: userRole.role.id,
				status: StatusEnum.ACTIVE,
				deletedAt: IsNull(),
				permission: { name: 'store:access_all', status: StatusEnum.ACTIVE },
			},
			relations: ['permission'],
		});

		return !!hasAll;
	}

	// Helper: Determina si el usuario tiene acceso a una tienda específica
	async userHasAccessToStore(
		userId: string,
		storeId: number,
	): Promise<boolean> {
		const user = await this.users.findOne({ where: { id: userId } });
		if (user?.isSuperRoot) return true;

		const store = await this.storeRepository.findOne({
			where: { id: storeId, status: StatusEnum.ACTIVE },
			withDeleted: false,
		});
		if (!store) return false;

		const hasAll = await this.userHasStoreAccessAll(userId, store.companyId);
		if (hasAll) return true;

		const userStore = await this.userStoreRepository.findOne({
			where: {
				userId,
				storeId,
				companyId: store.companyId,
				isActive: true,
			},
		});

		return !!userStore;
	}

	async getUserCompanyAndStores(userId: string) {
		try {
			// Buscar la membresía activa del usuario
			const membership = await this.userCompanyMembershipRepository.findOne({
				where: {
					userId,
					isActive: true,
				},
				relations: ['company'],
			});

			if (!membership || !membership.company) {
				return {
					ok: true,
					message: 'Usuario no tiene una compañía activa',
					data: {
						company: null,
						stores: [],
					},
				};
			}

			const company = membership.company;

			// Verificar si tiene acceso total a tiendas o solo a las asignadas
			const hasAccessAll = await this.userHasStoreAccessAll(userId, company.id);

			let stores: Store[] = [];
			if (hasAccessAll) {
				stores = await this.storeRepository.find({
					where: {
						company: { id: company.id },
						status: StatusEnum.ACTIVE,
					},
					withDeleted: false,
				});
			} else {
				const userStores = await this.userStoreRepository.find({
					where: {
						userId,
						companyId: company.id,
						isActive: true,
					},
					relations: ['store'],
				});

				stores = userStores
					.map((us) => us.store)
					.filter(
						(st) =>
							st && st.status === StatusEnum.ACTIVE && st.deletedAt === null,
					);
			}

			// Formatear la respuesta con solo id y nombre
			const result = {
				company: {
					id: company.id,
					name: company.name,
				},
				stores: stores.map((store) => ({
					id: store.id,
					name: store.name,
					ivaPercentage: Number(store.ivaPercentage ?? 19),
				})),
			};

			return {
				ok: true,
				message: 'Compañía y tiendas obtenidas correctamente',
				data: result,
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener la compañía y tiendas del usuario',
			);
		}
	}

	async createUserWithRole(dto: CreateUserWithRoleDto) {
		try {
			const {
				firstName,
				lastName,
				email,
				nationalId,
				password,
				phoneNumber,
				roleId,
				companyId,
				storeIds,
			} = dto;

			// Verificar si el usuario ya existe
			const existingUser = await this.users.findOne({
				where: [
					{ email },
					{ nationalId },
					{ username: createUserName(firstName, lastName, nationalId) },
				],
			});

			if (existingUser) {
				throw new BadRequestException('El usuario ya existe');
			}

			// Si se proporciona un roleId, verificar que el rol exista y esté activo
			if (roleId) {
				const roleRepository = this.dataSource.getRepository(Role);
				const role = await roleRepository.findOne({
					where: {
						id: roleId,
						status: StatusEnum.ACTIVE,
					},
				});

				if (!role) {
					throw new BadRequestException(
						`El rol ${roleId} no existe o está desactivado`,
					);
				}
			}

			// Si se proporciona un companyId, verificar que la compañía exista
			if (companyId !== undefined) {
				const company = await this.companyRepository.findOne({
					where: { id: companyId },
					withDeleted: false,
				});

				if (!company) {
					throw new BadRequestException(
						`La compañía con ID ${companyId} no existe o está desactivada`,
					);
				}
			}

			// Validar que las tiendas existan y pertenezcan a la compañía
			if (storeIds && storeIds.length > 0 && companyId !== undefined) {
				const stores = await this.storeRepository.find({
					where: {
						company: { id: companyId },
						status: StatusEnum.ACTIVE,
					},
					withDeleted: false,
				});
				const validStoreIds = new Set(stores.map((s) => s.id));
				for (const sId of storeIds) {
					if (!validStoreIds.has(sId)) {
						throw new BadRequestException(
							`La tienda ${sId} no pertenece a la compañía o está inactiva`,
						);
					}
				}
			}

			// Crear el username
			const username = createUserName(firstName, lastName, nationalId);

			// Hashear el password
			const hashedPassword = await hashPassword(password);

			// Ejecutar transacción para crear usuario y asignar rol
			const result = await processTransaction(
				this.dataSource,
				async (queryRunner) => {
					// Crear el usuario
					const newUser = queryRunner.manager.create(User, {
						username,
						firstName,
						lastName,
						email,
						nationalId,
						password: hashedPassword,
						phoneNumber,
					});
					const savedUser = await queryRunner.manager.save(User, newUser);

					// Si se proporciona un roleId, asignar el rol al usuario
					if (roleId) {
						const userRole = queryRunner.manager.create(UserRole, {
							userId: savedUser.id,
							roleId,
							companyId: companyId !== undefined ? companyId : 1, // Usar companyId si se proporciona, sino 1 por defecto
							status: StatusEnum.ACTIVE,
						});
						await queryRunner.manager.save(UserRole, userRole);
					}

					// Si se proporciona un companyId, crear la membresía
					if (companyId !== undefined) {
						const membership = queryRunner.manager.create(
							UserCompanyMembership,
							{
								userId: savedUser.id,
								companyId,
								isActive: true,
							},
						);
						await queryRunner.manager.save(UserCompanyMembership, membership);
					}

					// Si se proporcionan tiendas asignadas, guardarlas en UserStore
					if (storeIds && storeIds.length > 0 && companyId !== undefined) {
						const userStoreEntities = storeIds.map((sId) =>
							queryRunner.manager.create(UserStore, {
								userId: savedUser.id,
								storeId: sId,
								companyId,
								isActive: true,
							}),
						);
						await queryRunner.manager.save(UserStore, userStoreEntities);
					}

					return savedUser;
				},
			);

			void this.auditService.logAction({
				userId: result.id,
				companyId,
				module: 'USERS',
				action: 'USER_CREATED',
				entityName: 'User',
				entityId: result.id,
				description: `Usuario ${result.username} (${result.firstName} ${result.lastName}) registrado en el sistema`,
				details: { roleId, companyId, storeIds, email: result.email },
			});

			return {
				ok: true,
				message: 'Usuario creado correctamente',
				data: { result },
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof UnauthorizedException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al crear el usuario');
		}
	}

	async updateUserWithRole(dto: UpdateUserWithRoleDto) {
		try {
			const {
				id_user,
				firstName,
				lastName,
				email,
				nationalId,
				password,
				phoneNumber,
				roleId,
				companyId,
				storeIds,
			} = dto;

			// Verificar que el usuario existe
			const user = await this.users.findOne({
				where: { id: id_user },
				withDeleted: true,
			});

			if (!user) {
				throw new BadRequestException('El usuario no existe');
			}

			// Validar unicidad de email si cambió
			if (email && email !== user.email) {
				const existingEmail = await this.users.findOne({
					where: { email },
					withDeleted: true,
				});
				if (existingEmail && existingEmail.id !== id_user) {
					throw new BadRequestException('El correo electrónico ya está en uso');
				}
			}

			// Validar unicidad de cédula si cambió
			if (nationalId && nationalId !== user.nationalId) {
				const existingNationalId = await this.users.findOne({
					where: { nationalId },
					withDeleted: true,
				});
				if (existingNationalId && existingNationalId.id !== id_user) {
					throw new BadRequestException(
						'El número de identificación ya está en uso',
					);
				}
			}

			// Si se proporciona un roleId, verificar que el rol exista y esté activo
			if (roleId) {
				const roleRepository = this.dataSource.getRepository(Role);
				const role = await roleRepository.findOne({
					where: {
						id: roleId,
						status: StatusEnum.ACTIVE,
					},
				});

				if (!role) {
					throw new BadRequestException(
						`El rol ${roleId} no existe o está desactivado`,
					);
				}
			}

			// Si se proporciona un companyId, verificar que la compañía exista
			if (companyId !== undefined) {
				const company = await this.companyRepository.findOne({
					where: { id: companyId },
					withDeleted: false,
				});

				if (!company) {
					throw new BadRequestException(
						`La compañía con ID ${companyId} no existe o está desactivada`,
					);
				}
			}

			// Resolver compañía objetivo para tiendas
			let targetCompanyId = companyId;
			if (!targetCompanyId) {
				const currentMembership =
					await this.userCompanyMembershipRepository.findOne({
						where: { userId: id_user, isActive: true },
					});
				targetCompanyId = currentMembership?.companyId;
			}

			// Validar tiendas asignadas
			if (storeIds && storeIds.length > 0 && targetCompanyId !== undefined) {
				const stores = await this.storeRepository.find({
					where: {
						company: { id: targetCompanyId },
						status: StatusEnum.ACTIVE,
					},
					withDeleted: false,
				});
				const validStoreIds = new Set(stores.map((s) => s.id));
				for (const sId of storeIds) {
					if (!validStoreIds.has(sId)) {
						throw new BadRequestException(
							`La tienda ${sId} no pertenece a la compañía o está inactiva`,
						);
					}
				}
			}

			// Ejecutar transacción para actualizar usuario y rol
			const result = await processTransaction(
				this.dataSource,
				async (queryRunner) => {
					// Actualizar los campos del usuario solo si se proporcionan
					if (firstName !== undefined) user.firstName = firstName;
					if (lastName !== undefined) user.lastName = lastName;
					if (email !== undefined) user.email = email;
					if (nationalId !== undefined) user.nationalId = nationalId;
					if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
					if (password !== undefined) {
						user.password = await hashPassword(password);
					}
					user.updatedAt = new Date();

					const updatedUser = await queryRunner.manager.save(User, user);

					// Si se proporciona un roleId, manejar el rol del usuario
					if (roleId !== undefined) {
						// Buscar todos los UserRoles activos del usuario
						const existingUserRoles = await queryRunner.manager.find(UserRole, {
							where: { userId: id_user, status: StatusEnum.ACTIVE },
						});

						// Desactivar/eliminar los roles existentes (soft delete)
						if (existingUserRoles.length > 0) {
							await Promise.all(
								existingUserRoles.map(async (userRole) => {
									userRole.deletedAt = new Date();
									userRole.updatedAt = new Date();
									userRole.status = StatusEnum.DESACTIVE;
									await queryRunner.manager.save(UserRole, userRole);
								}),
							);
						}

						// Si se proporciona un roleId válido, crear o actualizar el rol
						if (roleId) {
							const finalCompanyId = companyId !== undefined ? companyId : 1;
							// Verificar si ya existe un UserRole con el mismo userId y roleId
							const existingUserRole = await queryRunner.manager.findOne(
								UserRole,
								{
									where: {
										userId: id_user,
										roleId,
									},
									withDeleted: true,
								},
							);

							if (existingUserRole) {
								// Si ya existe, actualizarlo
								existingUserRole.companyId = finalCompanyId;
								existingUserRole.status = StatusEnum.ACTIVE;
								existingUserRole.deletedAt = null;
								existingUserRole.updatedAt = new Date();
								await queryRunner.manager.save(UserRole, existingUserRole);
							} else {
								// Si no existe, crear uno nuevo
								const newUserRole = queryRunner.manager.create(UserRole, {
									userId: id_user,
									roleId,
									companyId: finalCompanyId,
									status: StatusEnum.ACTIVE,
								});
								await queryRunner.manager.save(UserRole, newUserRole);
							}
						}
					}

					// Si se proporciona un companyId, crear o actualizar la membresía
					if (companyId !== undefined) {
						// Desactivar todas las membresías activas del usuario en otras compañías
						const activeMemberships = await queryRunner.manager.find(
							UserCompanyMembership,
							{
								where: {
									userId: id_user,
									isActive: true,
								},
							},
						);

						// Desactivar las membresías que no sean de la compañía actual
						await Promise.all(
							activeMemberships
								.filter((m) => m.companyId !== companyId)
								.map(async (membership) => {
									membership.isActive = false;
									await queryRunner.manager.save(
										UserCompanyMembership,
										membership,
									);
								}),
						);

						// Buscar si ya existe una membresía para esta compañía
						const existingMembership = await queryRunner.manager.findOne(
							UserCompanyMembership,
							{
								where: {
									userId: id_user,
									companyId,
								},
							},
						);

						if (existingMembership) {
							// Si ya existe, activarla
							existingMembership.isActive = true;
							await queryRunner.manager.save(
								UserCompanyMembership,
								existingMembership,
							);
						} else {
							// Si no existe, crearla
							const membership = queryRunner.manager.create(
								UserCompanyMembership,
								{
									userId: id_user,
									companyId,
									isActive: true,
								},
							);
							await queryRunner.manager.save(UserCompanyMembership, membership);
						}
					}

					// Sincronizar tiendas asignadas si se proporcionó storeIds
					if (storeIds !== undefined && targetCompanyId) {
						const currentAssignments = await queryRunner.manager.find(
							UserStore,
							{ where: { userId: id_user } },
						);
						const targetSet = new Set(storeIds);

						// Desactivar las que no están en targetSet
						for (const assignment of currentAssignments) {
							if (!targetSet.has(assignment.storeId) && assignment.isActive) {
								assignment.isActive = false;
								assignment.updatedAt = new Date();
								await queryRunner.manager.save(UserStore, assignment);
							}
						}

						// Crear o reactivar las que están en targetSet
						for (const sId of storeIds) {
							const existing = currentAssignments.find(
								(a) => a.storeId === sId,
							);
							if (existing) {
								if (!existing.isActive) {
									existing.isActive = true;
									existing.companyId = targetCompanyId;
									existing.updatedAt = new Date();
									await queryRunner.manager.save(UserStore, existing);
								}
							} else {
								const newAssignment = queryRunner.manager.create(UserStore, {
									userId: id_user,
									storeId: sId,
									companyId: targetCompanyId,
									isActive: true,
								});
								await queryRunner.manager.save(UserStore, newAssignment);
							}
						}
					}

					return updatedUser;
				},
			);

			void this.auditService.logAction({
				userId: id_user,
				companyId: targetCompanyId,
				module: 'USERS',
				action: 'USER_UPDATED',
				entityName: 'User',
				entityId: id_user,
				description: `Información del usuario ${result.username} (${result.firstName} ${result.lastName}) actualizada`,
				details: { roleId, companyId: targetCompanyId, storeIds },
			});

			if (dto.password) {
				void this.auditService.logAction({
					userId: id_user,
					companyId: targetCompanyId,
					module: 'AUTH',
					action: 'PASSWORD_RESET',
					entityName: 'User',
					entityId: id_user,
					description: `Contraseña del usuario ${result.username} (${result.firstName} ${result.lastName}) modificada`,
				});
			}

			return {
				ok: true,
				message: 'Usuario actualizado correctamente',
				data: { result },
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof UnauthorizedException
			) {
				throw error;
			}
			throw new InternalServerErrorException('Error al actualizar el usuario');
		}
	}

	async adminResetPassword(dto: AdminResetPasswordDto, adminUser: RequestUser) {
		const user = await this.users.findOne({
			where: { id: dto.userId },
			withDeleted: true,
		});

		if (!user) {
			throw new NotFoundException('Usuario no encontrado');
		}

		user.password = await hashPassword(dto.newPassword);
		user.updatedAt = new Date();

		await this.users.save(user);

		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: user.id, isActive: true },
		});

		void this.auditService.logAction({
			userId: adminUser.userId,
			companyId: membership?.companyId ?? null,
			module: 'AUTH',
			action: 'PASSWORD_RESET',
			entityName: 'User',
			entityId: user.id,
			description: `Contraseña del usuario ${user.username} (${user.firstName} ${user.lastName}) restablecida por administrador general`,
			details: {
				targetUserId: user.id,
				username: user.username,
				resetBy: adminUser.username || adminUser.userId,
			},
		});

		return {
			ok: true,
			message: 'Contraseña restablecida correctamente',
		};
	}

	// ========== Sección: Users - Admin de Tienda ==========
	async getStoreUsers(userId: string) {
		// 1. Obtener la membresía del Admin de Tienda
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		const companyId = membership.companyId;

		// 2. Obtener todas las membresías activas para esa compañía
		const userMemberships = await this.userCompanyMembershipRepository.find({
			where: { companyId, isActive: true },
			relations: ['company'],
		});

		const userIds = userMemberships.map((m) => m.userId);

		if (userIds.length === 0) {
			return {
				ok: true,
				message: 'Usuarios obtenidos correctamente',
				data: { result: [] },
			};
		}

		// 3. Obtener los usuarios de esa compañía (incluyendo eliminados)
		const users = await this.users.find({
			where: userIds.map((id) => ({ id })),
			select: [
				'id',
				'username',
				'email',
				'nationalId',
				'isActive',
				'phoneNumber',
				'firstName',
				'lastName',
				'createdAt',
				'updatedAt',
				'deletedAt',
			],
			withDeleted: true,
		});

		// 4. Obtener roles de los usuarios de esa compañía
		const userRoles = await this.userRoleRepository.find({
			where: userIds.map((id) => ({ userId: id, status: StatusEnum.ACTIVE })),
			relations: ['role'],
			order: { createdAt: 'DESC' },
		});

		// Crear mapa de userId -> role
		const userRoleMap = new Map<string, Role>();
		userRoles.forEach((userRole) => {
			if (!userRoleMap.has(userRole.userId) && userRole.role) {
				userRoleMap.set(userRole.userId, userRole.role);
			}
		});

		// Obtener asignaciones de tiendas para los usuarios de la compañía
		const userStores = await this.userStoreRepository.find({
			where: userIds.map((id) => ({ userId: id })),
			relations: ['store'],
		});

		const userStoresMap = new Map<
			string,
			{ id: number; name: string; isActive: boolean }[]
		>();
		userStores.forEach((us) => {
			if (us.store) {
				const list = userStoresMap.get(us.userId) || [];
				list.push({
					id: us.store.id,
					name: us.store.name,
					isActive: us.isActive,
				});
				userStoresMap.set(us.userId, list);
			}
		});

		// 5. Formatear
		const company = userMemberships[0].company; // Todos comparten la misma compañía
		const usersWithRoles = users.map((user) => {
			const role = userRoleMap.get(user.id);
			return {
				...user,
				role: role
					? {
							id: role.id,
							companyId: role.companyId,
							name: role.name,
						}
					: null,
				company: company
					? {
							id: company.id,
							name: company.name,
						}
					: null,
				stores: userStoresMap.get(user.id) || [],
			};
		});

		return {
			ok: true,
			message: 'Usuarios obtenidos correctamente',
			data: { result: usersWithRoles },
		};
	}

	async getStoreUserById(id: string, requesterUserId: string) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: requesterUserId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		const targetUserMembership =
			await this.userCompanyMembershipRepository.findOne({
				where: { userId: id, companyId: membership.companyId, isActive: true },
			});

		if (!targetUserMembership) {
			throw new UnauthorizedException(
				'No tienes permisos para ver a este usuario',
			);
		}

		const user = await this.users.findOne({ where: { id }, withDeleted: true });
		if (!user) throw new UnauthorizedException('Usuario no encontrado');

		return {
			ok: true,
			message: 'Usuario obtenido correctamente',
			data: { result: user },
		};
	}

	async createStoreUserWithRole(
		dto: CreateUserWithRoleDto,
		requesterUserId: string,
	) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: requesterUserId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		// Forzar el companyId al del admin de tienda
		dto.companyId = membership.companyId;

		// Si envió un rol, validamos que pertenezca a la misma compañía
		if (dto.roleId) {
			const role = await this.dataSource.getRepository(Role).findOne({
				where: {
					id: dto.roleId,
					companyId: membership.companyId,
					status: StatusEnum.ACTIVE,
				},
			});
			if (!role) {
				throw new BadRequestException(
					'El rol no es válido o no pertenece a la compañía',
				);
			}
		}

		// Reutilizar lógica existente que ya maneja la creación de usuario, membresía y rol
		return this.createUserWithRole(dto);
	}

	async updateStoreUserWithRole(
		dto: UpdateUserWithRoleDto,
		requesterUserId: string,
	) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: requesterUserId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		// Validar que el usuario objetivo pertenece a la compañía del admin
		const targetUserMembership =
			await this.userCompanyMembershipRepository.findOne({
				where: {
					userId: dto.id_user,
					companyId: membership.companyId,
					isActive: true,
				},
			});

		if (!targetUserMembership) {
			throw new UnauthorizedException(
				'No tienes permisos para actualizar a este usuario',
			);
		}

		// Forzar el companyId
		dto.companyId = membership.companyId;

		// Validar que el rol (si se actualiza) pertenezca a la compañía
		if (dto.roleId) {
			const role = await this.dataSource.getRepository(Role).findOne({
				where: {
					id: dto.roleId,
					companyId: membership.companyId,
					status: StatusEnum.ACTIVE,
				},
			});
			if (!role) {
				throw new BadRequestException(
					'El rol no es válido o no pertenece a la compañía',
				);
			}
		}

		return this.updateUserWithRole(dto);
	}

	async storeResetPassword(dto: AdminResetPasswordDto, adminUser: RequestUser) {
		const membership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: adminUser.userId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		// Validar que el usuario objetivo pertenezca a la misma compañía
		const targetMembership = await this.userCompanyMembershipRepository.findOne({
			where: {
				userId: dto.userId,
				companyId: membership.companyId,
				isActive: true,
			},
		});

		if (!targetMembership) {
			throw new UnauthorizedException(
				'No tienes permisos para restablecer la contraseña de este usuario o no pertenece a tu compañía',
			);
		}

		const user = await this.users.findOne({
			where: { id: dto.userId },
			withDeleted: true,
		});

		if (!user) {
			throw new NotFoundException('Usuario no encontrado');
		}

		user.password = await hashPassword(dto.newPassword);
		user.updatedAt = new Date();

		await this.users.save(user);

		void this.auditService.logAction({
			userId: adminUser.userId,
			companyId: membership.companyId,
			module: 'AUTH',
			action: 'PASSWORD_RESET',
			entityName: 'User',
			entityId: user.id,
			description: `Contraseña del usuario ${user.username} (${user.firstName} ${user.lastName}) restablecida por administrador de empresa`,
			details: {
				targetUserId: user.id,
				username: user.username,
				companyId: membership.companyId,
				resetBy: adminUser.username || adminUser.userId,
			},
		});

		return {
			ok: true,
			message: 'Contraseña restablecida correctamente',
		};
	}

	// ========== Sección: Gestión de Empleados por Tienda ==========

	async getUsersByStore(storeId: number, requesterUserId: string) {
		const store = await this.storeRepository.findOne({
			where: { id: storeId, status: StatusEnum.ACTIVE },
		});
		if (!store) {
			throw new NotFoundException(
				'La tienda especificada no existe o no está activa',
			);
		}

		const hasAccess = await this.userHasAccessToStore(requesterUserId, storeId);
		if (!hasAccess) {
			throw new UnauthorizedException(
				'No tienes permisos para consultar los empleados de esta tienda',
			);
		}

		// Obtener las asignaciones a la tienda
		const userStores = await this.userStoreRepository.find({
			where: { storeId },
			relations: ['store'],
			order: { createdAt: 'DESC' },
		});

		if (userStores.length === 0) {
			return {
				ok: true,
				message: 'Empleados de la tienda obtenidos correctamente',
				data: { result: [] },
			};
		}

		const userIds = userStores.map((us) => us.userId);

		// Obtener usuarios
		const users = await this.users.find({
			where: userIds.map((id) => ({ id })),
			select: [
				'id',
				'username',
				'email',
				'nationalId',
				'isActive',
				'phoneNumber',
				'firstName',
				'lastName',
				'createdAt',
				'updatedAt',
				'deletedAt',
			],
			withDeleted: true,
		});

		// Obtener roles de los usuarios en la compañía de la tienda
		const userRoles = await this.userRoleRepository.find({
			where: userIds.map((id) => ({
				userId: id,
				companyId: store.companyId,
				status: StatusEnum.ACTIVE,
			})),
			relations: ['role'],
			order: { createdAt: 'DESC' },
		});

		const userRoleMap = new Map<string, Role>();
		userRoles.forEach((ur) => {
			if (!userRoleMap.has(ur.userId) && ur.role) {
				userRoleMap.set(ur.userId, ur.role);
			}
		});

		const userMap = new Map<string, User>();
		users.forEach((u) => userMap.set(u.id, u));

		const result = userStores
			.map((us) => {
				const u = userMap.get(us.userId);
				if (!u) return null;
				const role = userRoleMap.get(us.userId);
				return {
					...u,
					id: us.userId,
					role: role
						? {
								id: role.id,
								companyId: role.companyId,
								name: role.name,
							}
						: null,
					store: {
						id: us.store.id,
						name: us.store.name,
					},
					isActive: us.isActive,
					isStoreActive: us.isActive,
					isGlobalActive: u.isActive,
					assignedAt: us.createdAt,
				};
			})
			.filter((item) => item !== null);

		return {
			ok: true,
			message: 'Empleados de la tienda obtenidos correctamente',
			data: { result },
		};
	}

	async createStoreEmployee(
		dto: CreateStoreEmployeeDto,
		requesterUserId: string,
	) {
		const store = await this.storeRepository.findOne({
			where: { id: dto.storeId, status: StatusEnum.ACTIVE },
		});
		if (!store) {
			throw new NotFoundException(
				'La tienda especificada no existe o no está activa',
			);
		}

		const hasAccess = await this.userHasAccessToStore(
			requesterUserId,
			dto.storeId,
		);
		if (!hasAccess) {
			throw new UnauthorizedException(
				'No tienes permisos para registrar empleados en esta tienda',
			);
		}

		// Asignar companyId de la tienda y la tienda obligatoriamente
		dto.companyId = store.companyId;
		dto.storeIds = [dto.storeId];

		// Validar que el rol (si fue enviado) pertenezca a la compañía
		if (dto.roleId) {
			const role = await this.dataSource.getRepository(Role).findOne({
				where: {
					id: dto.roleId,
					companyId: store.companyId,
					status: StatusEnum.ACTIVE,
				},
			});
			if (!role) {
				throw new BadRequestException(
					'El rol no es válido o no pertenece a la compañía',
				);
			}
		}

		return this.createUserWithRole(dto);
	}

	async updateStoreEmployee(
		dto: UpdateStoreEmployeeDto,
		requesterUserId: string,
	) {
		const store = await this.storeRepository.findOne({
			where: { id: dto.storeId, status: StatusEnum.ACTIVE },
		});
		if (!store) {
			throw new NotFoundException(
				'La tienda especificada no existe o no está activa',
			);
		}

		const hasAccess = await this.userHasAccessToStore(
			requesterUserId,
			dto.storeId,
		);
		if (!hasAccess) {
			throw new UnauthorizedException(
				'No tienes permisos para actualizar empleados en esta tienda',
			);
		}

		// Validar que el usuario objetivo esté asignado a esta tienda
		const userStore = await this.userStoreRepository.findOne({
			where: { userId: dto.id_user, storeId: dto.storeId },
		});
		if (!userStore) {
			throw new NotFoundException('El empleado no está asignado a esta tienda');
		}

		// Asignar companyId de la tienda
		dto.companyId = store.companyId;

		// Validar que el rol (si fue enviado) pertenezca a la compañía
		if (dto.roleId) {
			const role = await this.dataSource.getRepository(Role).findOne({
				where: {
					id: dto.roleId,
					companyId: store.companyId,
					status: StatusEnum.ACTIVE,
				},
			});
			if (!role) {
				throw new BadRequestException(
					'El rol no es válido o no pertenece a la compañía',
				);
			}
		}

		return this.updateUserWithRole(dto);
	}

	async activateStoreEmployee(
		dto: StoreUserActionDto,
		requesterUserId: string,
	) {
		const hasAccess = await this.userHasAccessToStore(
			requesterUserId,
			dto.storeId,
		);
		if (!hasAccess) {
			throw new UnauthorizedException(
				'No tienes permisos para gestionar empleados en esta tienda',
			);
		}

		const userStore = await this.userStoreRepository.findOne({
			where: { userId: dto.userId, storeId: dto.storeId },
			relations: ['user', 'store'],
		});
		if (!userStore) {
			throw new NotFoundException('El empleado no está asignado a esta tienda');
		}

		userStore.isActive = true;
		userStore.updatedAt = new Date();
		await this.userStoreRepository.save(userStore);

		void this.auditService.logAction({
			userId: requesterUserId,
			companyId: userStore.companyId,
			module: 'USERS',
			action: 'STORE_USER_ACTIVATED',
			entityName: 'UserStore',
			entityId: `${dto.userId}:${dto.storeId}`,
			description: `Acceso a tienda ${userStore.store?.name ?? dto.storeId} reactivado para el usuario ${userStore.user?.username ?? dto.userId}`,
		});

		return {
			ok: true,
			message: 'Empleado activado en la tienda correctamente',
		};
	}

	async deactivateStoreEmployee(
		dto: StoreUserActionDto,
		requesterUserId: string,
	) {
		const hasAccess = await this.userHasAccessToStore(
			requesterUserId,
			dto.storeId,
		);
		if (!hasAccess) {
			throw new UnauthorizedException(
				'No tienes permisos para gestionar empleados en esta tienda',
			);
		}

		const userStore = await this.userStoreRepository.findOne({
			where: { userId: dto.userId, storeId: dto.storeId },
			relations: ['user', 'store'],
		});
		if (!userStore) {
			throw new NotFoundException('El empleado no está asignado a esta tienda');
		}

		userStore.isActive = false;
		userStore.updatedAt = new Date();
		await this.userStoreRepository.save(userStore);

		void this.auditService.logAction({
			userId: requesterUserId,
			companyId: userStore.companyId,
			module: 'USERS',
			action: 'STORE_USER_DEACTIVATED',
			entityName: 'UserStore',
			entityId: `${dto.userId}:${dto.storeId}`,
			description: `Acceso a tienda ${userStore.store?.name ?? dto.storeId} desactivado para el usuario ${userStore.user?.username ?? dto.userId}`,
		});

		return {
			ok: true,
			message: 'Empleado desactivado de la tienda correctamente',
		};
	}
}
