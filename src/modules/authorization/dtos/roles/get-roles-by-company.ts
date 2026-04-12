import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetRolesByCompanyDto {
	@IsNumber()
	@IsNotEmpty()
	companyId!: number;
}
