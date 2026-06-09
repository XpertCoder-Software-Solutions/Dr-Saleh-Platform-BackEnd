import { ApiProperty } from '@nestjs/swagger';

export class AddressGovernorateDto {
  @ApiProperty({ example: '8f5a18d9-fc08-4c25-b181-2c48108a5332' })
  id: string;

  @ApiProperty({ example: 'القاهرة' })
  nameAr: string;

  @ApiProperty({ example: 'Cairo' })
  nameEn: string;

  @ApiProperty({ example: 75 })
  shippingCost: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class UserAddressResponseDto {
  @ApiProperty({ example: 'c293b756-9ef0-4af4-b101-402a1c7bc8b5' })
  id: string;

  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  userId: string;

  @ApiProperty({ example: 'Ahmed Saleh' })
  fullName: string;

  @ApiProperty({ example: '+201001234567' })
  phoneNumber: string;

  @ApiProperty({
    example: '8f5a18d9-fc08-4c25-b181-2c48108a5332',
    nullable: true,
  })
  governorateId: string | null;

  @ApiProperty({ example: 'Nasr City' })
  city: string;

  @ApiProperty({ example: 'Makram Ebeid Street', nullable: true })
  street: string | null;

  @ApiProperty({ example: '12B', nullable: true })
  buildingNumber: string | null;

  @ApiProperty({ example: '3', nullable: true })
  floor: string | null;

  @ApiProperty({ example: '8', nullable: true })
  apartment: string | null;

  @ApiProperty({ example: 'Near the main pharmacy', nullable: true })
  landmark: string | null;

  @ApiProperty({ example: 'Call before arrival', nullable: true })
  notes: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: AddressGovernorateDto, nullable: true })
  governorate: AddressGovernorateDto | null;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  updatedAt: Date;
}

export class UserAddressDataDto {
  @ApiProperty({ type: UserAddressResponseDto })
  address: UserAddressResponseDto;
}

export class UserAddressListDataDto {
  @ApiProperty({ type: [UserAddressResponseDto] })
  addresses: UserAddressResponseDto[];
}

export class UserAddressApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Address returned successfully' })
  message: string;

  @ApiProperty({ type: UserAddressDataDto })
  data: UserAddressDataDto;
}

export class UserAddressListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Addresses returned successfully' })
  message: string;

  @ApiProperty({ type: UserAddressListDataDto })
  data: UserAddressListDataDto;
}

export class UserAddressDeleteApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Address deleted successfully' })
  message: string;

  @ApiProperty({ example: {} })
  data: Record<string, never>;
}
