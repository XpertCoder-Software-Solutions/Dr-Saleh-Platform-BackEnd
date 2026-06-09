import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

export class AdminResponseDto {
  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  firstName: string;

  @ApiProperty({ example: 'Name', nullable: true })
  lastName: string | null;

  @ApiProperty({ example: 'Admin Name' })
  fullName: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: '01000000000' })
  phoneNumber: string;

  @ApiProperty({
    enum: RoleName,
    enumName: 'RoleName',
    example: RoleName.Admin,
  })
  role: RoleName;

  @ApiProperty({ example: true })
  isEmailVerified: boolean;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z', nullable: true })
  emailVerifiedAt: Date | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  updatedAt: Date;
}

export class AdminPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class AdminDataDto {
  @ApiProperty({ type: AdminResponseDto })
  admin: AdminResponseDto;
}

export class AdminListDataDto {
  @ApiProperty({ type: [AdminResponseDto] })
  admins: AdminResponseDto[];

  @ApiProperty({ type: AdminPaginationDto })
  pagination: AdminPaginationDto;
}

export class AdminApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Admin returned successfully' })
  message: string;

  @ApiProperty({ type: AdminDataDto })
  data: AdminDataDto;
}

export class AdminListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Admins returned successfully' })
  message: string;

  @ApiProperty({ type: AdminListDataDto })
  data: AdminListDataDto;
}
