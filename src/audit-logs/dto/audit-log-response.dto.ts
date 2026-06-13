import { ApiProperty } from '@nestjs/swagger';

export class AuditLogDto {
  @ApiProperty({ example: 'bce44fea-6d28-4a6b-a95a-645c0905f7b3' })
  id: string;

  @ApiProperty({
    example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33',
    nullable: true,
  })
  actorUserId: string | null;

  @ApiProperty({ example: 'admin@example.com', nullable: true })
  actorEmail: string | null;

  @ApiProperty({ example: 'Admin', nullable: true })
  actorRole: string | null;

  @ApiProperty({ example: 'COURSE_CREATED' })
  action: string;

  @ApiProperty({ example: 'Course' })
  entityType: string;

  @ApiProperty({
    example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109',
    nullable: true,
  })
  entityId: string | null;

  @ApiProperty({ example: 'Admin created a course.', nullable: true })
  description: string | null;

  @ApiProperty({ example: '203.0.113.10', nullable: true })
  ipAddress: string | null;

  @ApiProperty({ example: 'Mozilla/5.0', nullable: true })
  userAgent: string | null;

  @ApiProperty({
    example: { params: { id: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109' } },
    nullable: true,
  })
  metadata: unknown;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdAt: Date;
}

export class AuditLogPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class AuditLogListDataDto {
  @ApiProperty({ type: [AuditLogDto] })
  logs: AuditLogDto[];

  @ApiProperty({ type: AuditLogPaginationDto })
  pagination: AuditLogPaginationDto;
}

export class AuditLogDataDto {
  @ApiProperty({ type: AuditLogDto })
  auditLog: AuditLogDto;
}

export class AuditLogListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Audit logs returned successfully' })
  message: string;

  @ApiProperty({ type: AuditLogListDataDto })
  data: AuditLogListDataDto;
}

export class AuditLogApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Audit log returned successfully' })
  message: string;

  @ApiProperty({ type: AuditLogDataDto })
  data: AuditLogDataDto;
}
