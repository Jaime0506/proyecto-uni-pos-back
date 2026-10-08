import {
	Controller,
	Get,
	HttpCode,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dtos/query-audit-logs.dto';
import { RequestUser } from 'src/types/global';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('audit')
export class AuditController {
	constructor(private readonly auditService: AuditService) {}

	@ApiTags('Audit - Admin')
	@Get('admin/logs')
	@RequirePermissions(['audit:read'])
	@HttpCode(200)
	async getAdminLogs(@Query() query: QueryAuditLogsDto) {
		return await this.auditService.getAdminLogs(query);
	}

	@ApiTags('Audit - Store')
	@Get('store/logs')
	@RequirePermissions(['audit:read'])
	@HttpCode(200)
	async getStoreLogs(
		@Query() query: QueryAuditLogsDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.auditService.getStoreLogs(query, req.user.userId);
	}
}
