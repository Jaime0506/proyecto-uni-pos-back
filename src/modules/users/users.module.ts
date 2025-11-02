import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UsersController } from './users.controller';
import { User } from 'src/core/users/user.entity';
import { UserRole } from 'src/modules/authorization/entities/user-role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [TypeOrmModule.forFeature([User, UserRole])],
	controllers: [UsersController],
	providers: [UserService],
})
export class UsersModule {}
