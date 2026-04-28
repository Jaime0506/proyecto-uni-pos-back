import {
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
	BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/core/users/user.entity';
import { UpdateDto } from './dtos/update.dto';
import { Repository, DataSource } from 'typeorm';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { compareSync } from 'bcrypt';
import { hashPassword, createUserName } from 'src/utils/auth.utilities';
import { DeleteDto } from './dtos/delete.dto';
import { CreateUserWithRoleDto } from './dtos/create-user-with-role.dto';
import { UpdateUserWithRoleDto } from './dtos/update-user-with-role.dto';
import { UserRole } from 'src/modules/authorization/entities/user-role.entity';
import { Role } from 'src/modules/authorization/entities/role.entity';
import { StatusEnum } from 'src/core/status.enum';
import { processTransaction } from 'src/database/transactions';
import { UserCompanyMembership } from './entities/user-company-membership.entity';
import { Company } from '../companies/entities/company.entity';
import { Store } from '../stores/entities/store.entity';

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
		private readonly dataSource: DataSource,
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

		const targetMembership = await this.userCompanyMembershipRepository.findOne({
			where: { userId: dto.id_user, companyId: membership.companyId },
		});

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

		return {
			ok: true,
			message: 'Usuario desactivado correctamente',
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

		// Formatear los resultados para incluir la propiedad role y company
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

			// Buscar las tiendas activas de la compañía
			const stores = await this.storeRepository.find({
				where: {
					company: { id: company.id },
					status: StatusEnum.ACTIVE,
				},
				withDeleted: false,
			});

			// Formatear la respuesta con solo id y nombre
			const result = {
				company: {
					id: company.id,
					name: company.name,
				},
				stores: stores.map((store) => ({
					id: store.id,
					name: store.name,
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

					return savedUser;
				},
			);

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
			} = dto;

			// Verificar que el usuario existe
			const user = await this.users.findOne({
				where: { id: id_user },
				withDeleted: false,
			});

			if (!user) {
				throw new BadRequestException('El usuario no existe');
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

					return updatedUser;
				},
			);

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
}
