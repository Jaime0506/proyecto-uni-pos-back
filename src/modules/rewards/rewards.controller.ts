import {
	Controller,
	Post,
	Body,
	UseGuards,
	Req,
	Get,
	Query,
	Patch,
	Delete,
	Param,
	ParseIntPipe,
	HttpCode,
} from '@nestjs/common';
import {
	ApiTags,
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
} from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { CreateRewardRuleDto } from './dto/create-reward-rule.dto';
import { UpdateRewardRuleDto } from './dto/update-reward-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
import type { Request } from 'express';
import { RequestUser } from 'src/types/global';

@ApiTags('Rewards')
@ApiBearerAuth()
@Controller('rewards')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RewardsController {
	constructor(private readonly rewardsService: RewardsService) {}

	@Post('create')
	@RequirePermissions({
		anyOf: ['rewards:create', 'campaign:create'],
	})
	@ApiOperation({ summary: 'Crear una regla de bonificación / campaña' })
	@ApiResponse({ status: 201, description: 'Regla creada exitosamente' })
	async createRewardRule(
		@Body() createRewardRuleDto: CreateRewardRuleDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.rewardsService.createRewardRule(
			createRewardRuleDto,
			req.user,
		);
	}

	@Get('get-all')
	@RequirePermissions({
		anyOf: ['rewards:read', 'campaign:read'],
	})
	@ApiOperation({ summary: 'Listar reglas de bonificación' })
	async getRewardRules(
		@Query('companyId') companyId: string,
		@Query('storeId') storeId: string,
		@Req() req: Request & { user: RequestUser },
	) {
		const companyIdNumber = parseInt(companyId, 10);
		const storeIdNumber = parseInt(storeId, 10);

		return await this.rewardsService.getRewardRules(
			companyIdNumber,
			storeIdNumber,
			req.user,
		);
	}

	@Get(':id')
	@RequirePermissions({
		anyOf: ['rewards:read', 'campaign:read'],
	})
	@ApiOperation({ summary: 'Obtener una regla de bonificación por ID' })
	async getRewardRuleById(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.rewardsService.getRewardRuleById(id, req.user);
	}

	@Patch('update/:id')
	@RequirePermissions({
		anyOf: ['rewards:update', 'campaign:update'],
	})
	@ApiOperation({ summary: 'Actualizar una regla de bonificación' })
	async updateRewardRule(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateRewardRuleDto: UpdateRewardRuleDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.rewardsService.updateRewardRule(
			id,
			updateRewardRuleDto,
			req.user,
		);
	}

	@Patch('toggle-status/:id')
	@RequirePermissions({
		anyOf: ['rewards:update', 'campaign:update'],
	})
	@ApiOperation({ summary: 'Activar o desactivar una regla de bonificación' })
	async toggleRewardRuleStatus(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.rewardsService.toggleRewardRuleStatus(id, req.user);
	}

	@Delete('delete/:id')
	@HttpCode(200)
	@RequirePermissions({
		anyOf: [
			'rewards:delete',
			'campaign:delete',
			'rewards:update',
			'campaign:update',
		],
	})
	@ApiOperation({ summary: 'Eliminar una regla de bonificación (soft-delete)' })
	async deleteRewardRule(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.rewardsService.deleteRewardRule(id, req.user);
	}
}
