import { ApiProperty } from '@nestjs/swagger';
import { WishlistItemType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CheckWishlistItemDto {
  @ApiProperty({
    enum: WishlistItemType,
    enumName: 'WishlistItemType',
    example: WishlistItemType.BOOK,
  })
  @IsEnum(WishlistItemType)
  itemType: WishlistItemType;

  @ApiProperty({
    example: '7cb9f85b-420f-4f4e-9330-85ab0675df90',
  })
  @IsUUID()
  itemId: string;
}
