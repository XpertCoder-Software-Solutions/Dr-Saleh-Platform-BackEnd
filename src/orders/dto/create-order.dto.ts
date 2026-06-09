import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: 'c293b756-9ef0-4af4-b101-402a1c7bc8b5',
    description:
      'Required when the cart contains products or physical books. Must belong to the authenticated user.',
  })
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    example: 'Deliver after 5 PM.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    example: '78b8bf41-0492-4ac7-9f7e-93fc68f6808f',
    description:
      'Reserved for future coupon flows. The order validates the coupon if provided but does not calculate coupon discounts yet.',
  })
  @IsOptional()
  @IsUUID()
  couponId?: string;
}
