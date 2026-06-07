import { PartialType } from '@nestjs/swagger';
import { CreateConsultationCategoryDto } from './create-consultation-category.dto';

export class UpdateConsultationCategoryDto extends PartialType(
  CreateConsultationCategoryDto,
) {}
