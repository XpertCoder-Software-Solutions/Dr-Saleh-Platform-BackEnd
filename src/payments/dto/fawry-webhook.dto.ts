import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class FawryWebhookDto {
  @ApiPropertyOptional({ example: 'c72827d084ea4b88949d91dd2db4996e' })
  @Allow()
  requestId?: string;

  @ApiProperty({ example: '963455678' })
  @Allow()
  fawryRefNumber: string;

  @ApiProperty({ example: 'DS-2026-000001' })
  @Allow()
  merchantRefNumber: string;

  @ApiProperty({ example: '1900.00' })
  @Allow()
  paymentAmount: string;

  @ApiProperty({ example: '1900.00' })
  @Allow()
  orderAmount: string;

  @ApiProperty({ example: 'PAID' })
  @Allow()
  orderStatus: string;

  @ApiProperty({ example: 'PAYATFAWRY' })
  @Allow()
  paymentMethod: string;

  @ApiPropertyOptional({
    example: '369552233',
    description:
      'Fawry notification field is commonly misspelled as paymentRefrenceNumber.',
  })
  @Allow()
  paymentRefrenceNumber?: string;

  @ApiPropertyOptional({ example: '369552233' })
  @Allow()
  paymentReferenceNumber?: string;

  @ApiPropertyOptional({ example: '1676356569911' })
  @Allow()
  paymentTime?: string;

  @ApiProperty({
    example: 'ab34dcddfab34dcddfab34dcddfab34dcddfab34dcddfab34dcddfab34dcddf',
  })
  @Allow()
  messageSignature: string;

  @ApiPropertyOptional({ example: 'Wrong Signature' })
  @Allow()
  failureReason?: string;
}
