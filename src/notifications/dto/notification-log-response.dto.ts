import { ApiProperty } from '@nestjs/swagger';
import { NotificationStatus, NotificationType } from '@prisma/client';

export class NotificationLogDto {
  @ApiProperty({ example: 'bce44fea-6d28-4a6b-a95a-645c0905f7b3' })
  id: string;

  @ApiProperty({
    example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({ example: 'student@example.com' })
  email: string;

  @ApiProperty({
    enum: NotificationType,
    enumName: 'NotificationType',
    example: NotificationType.PAYMENT_SUCCESS,
  })
  type: NotificationType;

  @ApiProperty({
    enum: NotificationStatus,
    enumName: 'NotificationStatus',
    example: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @ApiProperty({ example: null, nullable: true })
  errorMessage: string | null;

  @ApiProperty({ example: '2026-06-12T10:30:00.000Z', nullable: true })
  sentAt: Date | null;

  @ApiProperty({ example: '2026-06-12T10:29:58.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-12T10:30:00.000Z' })
  updatedAt: Date;
}

export class NotificationLogsPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class NotificationLogsDataDto {
  @ApiProperty({ type: [NotificationLogDto] })
  items: NotificationLogDto[];

  @ApiProperty({ type: NotificationLogsPaginationDto })
  pagination: NotificationLogsPaginationDto;
}

export class NotificationLogsApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Notification logs returned successfully' })
  message: string;

  @ApiProperty({ type: NotificationLogsDataDto })
  data: NotificationLogsDataDto;
}
