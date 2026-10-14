import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

export enum PaymobChannel {
  CARD = 'CARD',
  WALLET = 'WALLET',
  APPLE_PAY = 'APPLE_PAY',
}

export class CreatePaymobPaymentDto {
  @ApiProperty({ example: '78b8bf41-0492-4ac7-9f7e-93fc68f6808f' })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    enum: PaymobChannel,
    example: PaymobChannel.CARD,
    description: 'Card (Visa/Mastercard/Meeza), mobile wallet, or Apple Pay.',
  })
  @IsEnum(PaymobChannel)
  channel: PaymobChannel;
}
