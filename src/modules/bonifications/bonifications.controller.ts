import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { BonificationsService } from './bonifications.service';
import { GetAllBonificationsDto } from './dto/get-all-bonifications.dto';
import { UpdateBonificationDto } from './dto/update-bonification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/authorization-guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('bonifications')
export class BonificationsController {
	constructor(private readonly bonificationsService: BonificationsService) {}

	// Obtener todas las bonificaciones
	@Post('get-all')
	@UseGuards(PermissionGuard)
	// @RequirePermissions(['bonification:read'])
	@HttpCode(200)
	async getAllBonifications(@Body() dto: GetAllBonificationsDto) {
		return await this.bonificationsService.getAllBonifications(dto);
	}

	// Actualizar una bonificación
	@Post('update')
	@UseGuards(PermissionGuard)
	// @RequirePermissions(['bonification:update'])
	@HttpCode(200)
	async updateBonification(@Body() dto: UpdateBonificationDto) {
		return await this.bonificationsService.updateBonification(dto);
	}
}
