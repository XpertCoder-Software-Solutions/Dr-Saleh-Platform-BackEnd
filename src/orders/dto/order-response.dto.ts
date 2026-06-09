import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemType, OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ example: '5687d090-c3db-4e2f-9645-8fd715f810cf' })
  id: string;

  @ApiProperty({ example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922' })
  orderId: string;

  @ApiProperty({
    enum: OrderItemType,
    enumName: 'OrderItemType',
    example: OrderItemType.COURSE,
  })
  itemType: OrderItemType;

  @ApiProperty({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  itemId: string;

  @ApiProperty({ example: 'Arabic title snapshot' })
  titleAr: string;

  @ApiProperty({ example: 'English title snapshot' })
  titleEn: string;

  @ApiProperty({ example: 1 })
  quantity: number;

  @ApiProperty({ example: 1200 })
  unitPrice: number;

  @ApiProperty({ example: 950, nullable: true })
  discountPrice: number | null;

  @ApiProperty({ example: 950 })
  totalPrice: number;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  updatedAt: Date;
}

export class OrderUserDto {
  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  id: string;

  @ApiProperty({ example: 'Dr Saleh User' })
  fullName: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '+201000000000' })
  phoneNumber: string;
}

export class OrderShippingGovernorateDto {
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

export class OrderShippingAddressDto {
  @ApiProperty({ example: 'c293b756-9ef0-4af4-b101-402a1c7bc8b5' })
  id: string;

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

  @ApiProperty({ type: OrderShippingGovernorateDto, nullable: true })
  governorate: OrderShippingGovernorateDto | null;
}

export class OrderResponseDto {
  @ApiProperty({ example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922' })
  id: string;

  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  userId: string;

  @ApiProperty({ example: 'DS-2026-000001' })
  orderNumber: string;

  @ApiProperty({
    enum: OrderStatus,
    enumName: 'OrderStatus',
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({
    enum: PaymentStatus,
    enumName: 'PaymentStatus',
    example: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: 'EGP' })
  currency: string;

  @ApiProperty({ example: 2400 })
  subtotal: number;

  @ApiProperty({ example: 500 })
  discountAmount: number;

  @ApiProperty({ example: 75 })
  shippingCost: number;

  @ApiProperty({ example: 1975 })
  totalAmount: number;

  @ApiProperty({ example: true })
  hasPhysicalItems: boolean;

  @ApiProperty({ example: 'Deliver after 5 PM.', nullable: true })
  notes: string | null;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: OrderUserDto })
  user?: OrderUserDto;

  @ApiProperty({ type: OrderShippingAddressDto, nullable: true })
  shippingAddress: OrderShippingAddressDto | null;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}

export class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class OrderDataDto {
  @ApiProperty({ type: OrderResponseDto })
  order: OrderResponseDto;
}

export class OrderListDataDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items: OrderResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class OrderApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Order returned successfully' })
  message: string;

  @ApiProperty({ type: OrderDataDto })
  data: OrderDataDto;
}

export class OrderListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Orders returned successfully' })
  message: string;

  @ApiProperty({ type: OrderListDataDto })
  data: OrderListDataDto;
}
