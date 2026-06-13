import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../common/utils/pagination';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminContactQueryDto } from './dto/admin-contact-query.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

const contactMessageSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  isOpened: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ContactMessageSelect;

type ContactMessageRecord = Prisma.ContactMessageGetPayload<{
  select: typeof contactMessageSelect;
}>;

type EmptyData = Record<string, never>;

@Injectable()
export class ContactUsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submit(
    createContactMessageDto: CreateContactMessageDto,
  ): Promise<{ message: string; data: EmptyData }> {
    const contactMessage = await this.prisma.contactMessage.create({
      data: {
        name: createContactMessageDto.name,
        email: this.normalizeEmail(createContactMessageDto.email),
        phone: createContactMessageDto.phone,
        message: createContactMessageDto.message,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    await this.notificationsService.sendContactMessageReceived({
      email: contactMessage.email,
      fullName: contactMessage.name,
    });

    return {
      message:
        'Your message has been received successfully. We will contact you as soon as possible.',
      data: {},
    };
  }

  async adminFindAll(query: AdminContactQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildAdminWhere(query);

    const [total, messages] = await this.prisma.$transaction([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        select: contactMessageSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Contact messages returned successfully',
      data: {
        messages: messages.map((message) => this.toContactMessage(message)),
        pagination: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async adminFindOne(id: string) {
    const contactMessage = await this.prisma.contactMessage.findUnique({
      where: { id },
      select: contactMessageSelect,
    });

    if (!contactMessage) {
      throw new NotFoundException('Contact message not found.');
    }

    if (contactMessage.isOpened) {
      return this.toContactMessage(contactMessage);
    }

    const openedMessage = await this.prisma.contactMessage.update({
      where: { id },
      data: { isOpened: true },
      select: contactMessageSelect,
    });

    return this.toContactMessage(openedMessage);
  }

  async adminDelete(id: string): Promise<{ message: string; data: EmptyData }> {
    await this.adminFindOne(id);

    await this.prisma.contactMessage.delete({
      where: { id },
    });

    return {
      message: 'Contact message deleted successfully',
      data: {},
    };
  }

  private buildAdminWhere(
    query: AdminContactQueryDto,
  ): Prisma.ContactMessageWhereInput {
    const where: Prisma.ContactMessageWhereInput = {};
    const search = query.search?.trim();

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toContactMessage(contactMessage: ContactMessageRecord) {
    return {
      id: contactMessage.id,
      name: contactMessage.name,
      email: contactMessage.email,
      phone: contactMessage.phone,
      message: contactMessage.message,
      isOpened: contactMessage.isOpened,
      createdAt: contactMessage.createdAt,
      updatedAt: contactMessage.updatedAt,
    };
  }
}
