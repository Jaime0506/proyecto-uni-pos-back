import {
	Injectable,
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { DeleteCompanyDto } from './dtos/delete-company.dto';
import { StatusEnum } from 'src/core/status.enum';

@Injectable()
export class CompanyService {
	constructor(
		@InjectRepository(Company)
		private readonly companyRepository: Repository<Company>,
	) {}

	// Obtener todas las compañías (incluyendo desactivadas)
	async getAllCompanies() {
		try {
			const companies = await this.companyRepository.find({
				withDeleted: true,
			});

			return {
				ok: true,
				message: 'Compañías obtenidas correctamente',
				data: { result: companies },
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener las compañías');
		}
	}

	// Crear una nueva compañía
	async createCompany(dto: CreateCompanyDto) {
		try {
			const { name, nit, address, dns, phone, email, maxStores } = dto;

			// Verificar si la compañía ya existe por NIT
			const existingCompany = await this.companyRepository.findOne({
				where: { nit },
				withDeleted: true,
			});

			if (existingCompany) {
				throw new BadRequestException(`La compañía con NIT ${nit} ya existe`);
			}

			// Crear la compañía
			const newCompany = new Company();
			newCompany.name = name;
			newCompany.nit = nit;
			if (address !== undefined) newCompany.address = address;
			if (dns !== undefined) newCompany.dns = dns;
			if (phone !== undefined) newCompany.phone = phone;
			if (email !== undefined) newCompany.email = email;
			newCompany.maxStores = maxStores ?? 1;

			const savedCompany = await this.companyRepository.save(newCompany);

			return {
				ok: true,
				message: 'Compañía creada correctamente',
				data: { result: savedCompany },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al crear la compañía');
		}
	}

	// Actualizar una compañía
	async updateCompany(dto: UpdateCompanyDto) {
		try {
			const { id, name, nit, address, dns, phone, email, maxStores, status } =
				dto;

			// Verificar si la compañía existe
			const existingCompany = await this.companyRepository.findOne({
				where: { id },
				withDeleted: true,
			});

			if (!existingCompany) {
				throw new BadRequestException(`La compañía ${id} no existe`);
			}

			// Verificar si el NIT cambió, y si cambió verificar si ya existe otra compañía con el mismo NIT
			if (nit && nit !== existingCompany.nit) {
				const existingCompanyWithSameNit = await this.companyRepository.findOne(
					{
						where: { nit },
						withDeleted: true,
					},
				);

				if (existingCompanyWithSameNit) {
					throw new BadRequestException(
						`El NIT ${nit} ya existe para otra compañía`,
					);
				}
			}

			// Actualizar campos
			existingCompany.name = name ?? existingCompany.name;
			existingCompany.nit = nit ?? existingCompany.nit;
			existingCompany.address =
				address !== undefined ? address : existingCompany.address;
			existingCompany.dns = dns !== undefined ? dns : existingCompany.dns;
			existingCompany.phone =
				phone !== undefined ? phone : existingCompany.phone;
			existingCompany.email =
				email !== undefined ? email : existingCompany.email;
			existingCompany.maxStores =
				maxStores !== undefined ? maxStores : existingCompany.maxStores;
			existingCompany.updatedAt = new Date();

			// Manejar cambio de estado
			if (status && status !== existingCompany.status) {
				existingCompany.status = status;
				existingCompany.updatedAt = new Date();

				if (status === StatusEnum.DESACTIVE) {
					existingCompany.deletedAt = new Date();
				} else {
					existingCompany.deletedAt = null;
				}
			}

			const updatedCompany = await this.companyRepository.save(existingCompany);

			return {
				ok: true,
				message: 'Compañía actualizada correctamente',
				data: { result: updatedCompany },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al actualizar la compañía');
		}
	}

	// Eliminar una compañía (soft delete)
	async deleteCompany(dto: DeleteCompanyDto) {
		try {
			const { id } = dto;

			// Verificar si la compañía existe
			const existingCompany = await this.companyRepository.findOne({
				where: { id },
			});

			if (!existingCompany) {
				throw new BadRequestException(`La compañía ${id} no existe`);
			}

			// Eliminar la compañía (soft delete)
			existingCompany.deletedAt = new Date();
			existingCompany.updatedAt = new Date();
			existingCompany.status = StatusEnum.DESACTIVE;

			const deletedCompany = await this.companyRepository.save(existingCompany);

			return {
				ok: true,
				message: 'Compañía eliminada correctamente',
				data: { result: deletedCompany },
			};
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException('Error al eliminar la compañía');
		}
	}
}
