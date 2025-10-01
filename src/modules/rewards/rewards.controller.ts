import {
	Controller,
	Post,
	Body,
	UseGuards,
	Request,
	Get,
	Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { CreateRewardRuleDto } from './dto/create-reward-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermissions } from '../auth/authorization';

@ApiTags('Rewards')
@ApiBearerAuth()
@Controller('rewards')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RewardsController {
	constructor(private readonly rewardsService: RewardsService) {}

	@Post('create')
	@RequirePermissions(['rewards:create'])
	async createRewardRule(
		@Body() createRewardRuleDto: CreateRewardRuleDto,
		@Request() req: { user: { userId: string } },
	) {
		const userId = req.user.userId;
		return await this.rewardsService.createRewardRule(
			createRewardRuleDto,
			userId,
		);
	}

	@Get('get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['rewards:read'])
	async getRewardRules(@Query('companyId') companyId?: string) {
		const companyIdNumber = companyId ? parseInt(companyId, 10) : undefined;
		return await this.rewardsService.getRewardRules(companyIdNumber);
	}

	// @Get(':id')
	// @UseGuards(PermissionGuard)
	// @RequirePermissions(['rewards:read'])
	// async getRewardRuleById(@Param('id', ParseIntPipe) id: number) {
	// 	return await this.rewardsService.getRewardRuleById(id);
	// }
}
