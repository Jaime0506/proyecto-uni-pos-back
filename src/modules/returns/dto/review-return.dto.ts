import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveReturnDto {
	@ApiPropertyOptional({
		description: 'Método de reembolso confirmado (CASH o BONUS)',
		enum: ['CASH', 'BONUS'],
	})
	@IsString()
	@IsIn(['CASH', 'BONUS'])
	@IsOptional()
	refundMethod?: 'CASH' | 'BONUS';

	@ApiPropertyOptional({ description: 'Observaciones internas de aprobación' })
	@IsString()
	@IsOptional()
	approvalNotes?: string;
}

export class RejectReturnDto {
	@ApiProperty({
		description: 'Motivo formal y obligatorio del rechazo de la devolución',
	})
	@IsString()
	@IsNotEmpty({ message: 'El motivo del rechazo es obligatorio.' })
	rejectionReason!: string;

	@ApiPropertyOptional({
		description: 'Notas internas adicionales de la revisión',
	})
	@IsString()
	@IsOptional()
	reviewNotes?: string;
}
