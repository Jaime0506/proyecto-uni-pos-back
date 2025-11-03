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

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User) private readonly users: Repository<User>,
		@InjectRepository(UserRole)
		private readonly userRoleRepository: Repository<UserRole>,
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

	// ========== Sección: Users - Admin Interno ==========
	async getAllUsers() {
		// Obtener todos los usuarios (incluyendo eliminados)
		const users = await this.users.find({
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

		// Crear un mapa de userId -> role para acceso rápido
		const userRoleMap = new Map<string, Role>();
		userRoles.forEach((userRole) => {
			// Si un usuario tiene múltiples roles, tomar el más reciente (ya ordenado por createdAt DESC)
			if (!userRoleMap.has(userRole.userId) && userRole.role) {
				userRoleMap.set(userRole.userId, userRole.role);
			}
		});

		// Formatear los resultados para incluir la propiedad role
		const usersWithRoles = users.map((user) => {
			const role = userRoleMap.get(user.id);

			const userWithRole = {
				...user,
				role: role
					? {
							id: role.id,
							companyId: role.companyId,
							name: role.name,
							description: role.description,
							status: role.status,
							deletedAt: role.deletedAt,
							createdAt: role.createdAt,
							updatedAt: role.updatedAt,
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
							companyId: 1, // Hardcodeado a 1 por ahora
							status: StatusEnum.ACTIVE,
						});
						await queryRunner.manager.save(UserRole, userRole);
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

						// Si se proporciona un roleId válido, crear el nuevo rol
						if (roleId) {
							const newUserRole = queryRunner.manager.create(UserRole, {
								userId: id_user,
								roleId,
								companyId: 1, // Hardcodeado a 1 por ahora (igual que en create)
								status: StatusEnum.ACTIVE,
							});
							await queryRunner.manager.save(UserRole, newUserRole);
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
}
