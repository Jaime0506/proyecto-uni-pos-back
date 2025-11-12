import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UsersController } from './users.controller';
import { User } from 'src/core/users/user.entity';
import { UserRole } from 'src/modules/authorization/entities/user-role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { UserCompanyMembership } from './entities/user-company-membership.entity';
import { Store } from '../stores/entities/store.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			User,
			UserRole,
			Company,
			UserCompanyMembership,
			Store,
		]),
	],
	controllers: [UsersController],
	providers: [UserService],
})
export class UsersModule {}
