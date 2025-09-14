import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/core/users/user.entity';
import { UpdateDto } from './dtos/update.dto';
import { Repository } from 'typeorm';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { compareSync } from 'bcrypt';
import { hashPassword } from 'src/utils/auth.utilities';
import { DeleteDto } from './dtos/delete.dto';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User) private readonly users: Repository<User>,
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
}
