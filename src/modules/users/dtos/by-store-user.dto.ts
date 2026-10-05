import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID } from 'class-validator';
import { CreateUserWithRoleDto } from './create-user-with-role.dto';
import { UpdateUserWithRoleDto } from './update-user-with-role.dto';

export class CreateStoreEmployeeDto extends CreateUserWithRoleDto {
	@ApiProperty({
		description: 'ID de la tienda a la que se asignará el empleado',
	})
	@IsNotEmpty()
	@IsInt()
	storeId!: number;
}

export class UpdateStoreEmployeeDto extends UpdateUserWithRoleDto {
	@ApiProperty({ description: 'ID de la tienda' })
	@IsNotEmpty()
	@IsInt()
	storeId!: number;
}

export class StoreUserActionDto {
	@ApiProperty({ description: 'ID del usuario' })
	@IsNotEmpty()
	@IsUUID()
	userId!: string;

	@ApiProperty({ description: 'ID de la tienda' })
	@IsNotEmpty()
	@IsInt()
	storeId!: number;
}
