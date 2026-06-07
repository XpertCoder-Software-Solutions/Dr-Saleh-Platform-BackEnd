import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BrevoEmailService } from '../email/brevo-email.service';
import { AdminConsultationQueryDto } from './dto/admin-consultation-query.dto';
import {
  ConsultationCategoryQueryDto,
  ConsultationLanguage,
} from './dto/consultation-category-query.dto';
import { CreateConsultationCategoryDto } from './dto/create-consultation-category.dto';
import { CreateConsultationRequestDto } from './dto/create-consultation-request.dto';
import { UpdateConsultationCategoryDto } from './dto/update-consultation-category.dto';

const consultationCategorySelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConsultationCategorySelect;

const consultationRequestSelect = {
  id: true,
  categoryId: true,
  fullName: true,
  age: true,
  gender: true,
  country: true,
  phone: true,
  whatsApp: true,
  email: true,
  consultationTopic: true,
  notes: true,
  createdAt: true,
  category: {
    select: consultationCategorySelect,
  },
} satisfies Prisma.ConsultationRequestSelect;

type ConsultationCategoryRecord = Prisma.ConsultationCategoryGetPayload<{
  select: typeof consultationCategorySelect;
}>;

type ConsultationRequestRecord = Prisma.ConsultationRequestGetPayload<{
  select: typeof consultationRequestSelect;
}>;

type EmptyData = Record<string, never>;

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoEmailService: BrevoEmailService,
  ) {}

  async findActiveCategories(query: ConsultationCategoryQueryDto) {
    const categories = await this.prisma.consultationCategory.findMany({
      where: { isActive: true },
      select: consultationCategorySelect,
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return categories.map((category) =>
      this.toPublicCategory(category, query.lang),
    );
  }

  async submitRequest(
    createConsultationRequestDto: CreateConsultationRequestDto,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.ensureActiveCategoryExists(
      createConsultationRequestDto.categoryId,
    );

    const request = await this.prisma.consultationRequest.create({
      data: {
        categoryId: createConsultationRequestDto.categoryId,
        fullName: createConsultationRequestDto.fullName,
        age: createConsultationRequestDto.age,
        gender: createConsultationRequestDto.gender,
        country: createConsultationRequestDto.country,
        phone: createConsultationRequestDto.phone,
        whatsApp: createConsultationRequestDto.whatsApp,
        email: this.normalizeEmail(createConsultationRequestDto.email),
        consultationTopic: createConsultationRequestDto.consultationTopic,
        notes: createConsultationRequestDto.notes,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    await this.sendConfirmationEmail(request.email, request.fullName);

    return {
      message:
        'Consultation request submitted successfully. We will contact you as soon as possible.',
      data: {},
    };
  }

  adminFindCategories() {
    return this.prisma.consultationCategory.findMany({
      select: consultationCategorySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminFindCategory(id: string) {
    return this.findCategoryOrThrow(id);
  }

  async adminCreateCategory(
    createConsultationCategoryDto: CreateConsultationCategoryDto,
  ) {
    const category = await this.prisma.consultationCategory.create({
      data: {
        nameAr: createConsultationCategoryDto.nameAr,
        nameEn: createConsultationCategoryDto.nameEn,
        isActive: createConsultationCategoryDto.isActive ?? true,
      },
      select: consultationCategorySelect,
    });

    return {
      message: 'Consultation category created successfully',
      data: { category },
    };
  }

  async adminUpdateCategory(
    id: string,
    updateConsultationCategoryDto: UpdateConsultationCategoryDto,
  ) {
    await this.findCategoryOrThrow(id);

    const category = await this.prisma.consultationCategory.update({
      where: { id },
      data: {
        nameAr: updateConsultationCategoryDto.nameAr,
        nameEn: updateConsultationCategoryDto.nameEn,
        isActive: updateConsultationCategoryDto.isActive,
      },
      select: consultationCategorySelect,
    });

    return {
      message: 'Consultation category updated successfully',
      data: { category },
    };
  }

  async adminDeleteCategory(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findCategoryOrThrow(id);

    const requestsCount = await this.prisma.consultationRequest.count({
      where: { categoryId: id },
    });

    if (requestsCount > 0) {
      throw new ConflictException(
        'Consultation category cannot be deleted while requests are assigned to it. Set isActive to false instead.',
      );
    }

    await this.prisma.consultationCategory.delete({
      where: { id },
    });

    return {
      message: 'Consultation category deleted successfully',
      data: {},
    };
  }

  async adminFindRequests(query: AdminConsultationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildAdminRequestsWhere(query);

    const [total, requests] = await this.prisma.$transaction([
      this.prisma.consultationRequest.count({ where }),
      this.prisma.consultationRequest.findMany({
        where,
        select: consultationRequestSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Consultation requests returned successfully',
      data: {
        requests: requests.map((request) => this.toRequest(request)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async adminFindRequest(id: string) {
    const request = await this.prisma.consultationRequest.findUnique({
      where: { id },
      select: consultationRequestSelect,
    });

    if (!request) {
      throw new NotFoundException('Consultation request not found.');
    }

    return this.toRequest(request);
  }

  async adminDeleteRequest(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.adminFindRequest(id);

    await this.prisma.consultationRequest.delete({
      where: { id },
    });

    return {
      message: 'Consultation request deleted successfully',
      data: {},
    };
  }

  private async ensureActiveCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.consultationCategory.findFirst({
      where: {
        id: categoryId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException(
        'Consultation category does not exist or is inactive.',
      );
    }
  }

  private async findCategoryOrThrow(
    id: string,
  ): Promise<ConsultationCategoryRecord> {
    const category = await this.prisma.consultationCategory.findUnique({
      where: { id },
      select: consultationCategorySelect,
    });

    if (!category) {
      throw new NotFoundException('Consultation category not found.');
    }

    return category;
  }

  private buildAdminRequestsWhere(
    query: AdminConsultationQueryDto,
  ): Prisma.ConsultationRequestWhereInput {
    const where: Prisma.ConsultationRequestWhereInput = {};
    const search = query.search?.trim();

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { whatsApp: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { consultationTopic: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async sendConfirmationEmail(
    email: string,
    fullName: string,
  ): Promise<void> {
    try {
      await this.brevoEmailService.sendConsultationConfirmation(
        email,
        fullName,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send consultation confirmation email to ${email}.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublicCategory(
    category: ConsultationCategoryRecord,
    language?: ConsultationLanguage,
  ) {
    return {
      id: category.id,
      name: this.getLocalizedName(category, language),
      nameAr: category.nameAr,
      nameEn: category.nameEn,
    };
  }

  private toRequest(request: ConsultationRequestRecord) {
    return {
      id: request.id,
      categoryId: request.categoryId,
      fullName: request.fullName,
      age: request.age,
      gender: request.gender,
      country: request.country,
      phone: request.phone,
      whatsApp: request.whatsApp,
      email: request.email,
      consultationTopic: request.consultationTopic,
      notes: request.notes,
      createdAt: request.createdAt,
      category: request.category,
    };
  }

  private getLocalizedName(
    record: { nameAr: string; nameEn: string },
    language?: ConsultationLanguage,
  ): string {
    return language === ConsultationLanguage.Arabic
      ? record.nameAr
      : record.nameEn;
  }

  private getLocalizedOrderBy(language?: ConsultationLanguage) {
    return language === ConsultationLanguage.Arabic
      ? { nameAr: 'asc' as const }
      : { nameEn: 'asc' as const };
  }
}
