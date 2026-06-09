import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePaypalPaymentDto {
  @ApiProperty({
    example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922',
    description: 'Pending USD order UUID owned by the authenticated user.',
  })
  @IsUUID()
  orderId: string;
}
