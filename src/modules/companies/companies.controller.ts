import { Controller } from '@nestjs/common';
import { CompanyService } from './companies.service';

@Controller('company')
export class CompanyController {
	constructor(private readonly companyService: CompanyService) {}
}
