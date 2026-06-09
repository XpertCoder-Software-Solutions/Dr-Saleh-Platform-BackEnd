import { ApiProperty } from '@nestjs/swagger';

export class GovernorateResponseDto {
  @ApiProperty({ example: '8f5a18d9-fc08-4c25-b181-2c48108a5332' })
  id: string;

  @ApiProperty({ example: 'القاهرة' })
  nameAr: string;

  @ApiProperty({ example: 'Cairo' })
  nameEn: string;

  @ApiProperty({ example: 'Cairo' })
  name: string;

  @ApiProperty({ example: 75 })
  shippingCost: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  updatedAt: Date;
}

export class GovernorateDataDto {
  @ApiProperty({ type: GovernorateResponseDto })
  governorate: GovernorateResponseDto;
}

export class GovernorateListDataDto {
  @ApiProperty({ type: [GovernorateResponseDto] })
  governorates: GovernorateResponseDto[];
}

export class GovernorateApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Governorate returned successfully' })
  message: string;

  @ApiProperty({ type: GovernorateDataDto })
  data: GovernorateDataDto;
}

export class GovernorateListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Governorates returned successfully' })
  message: string;

  @ApiProperty({ type: GovernorateListDataDto })
  data: GovernorateListDataDto;
}

export class GovernorateDeleteApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Governorate deleted successfully' })
  message: string;

  @ApiProperty({ example: {} })
  data: Record<string, never>;
}
