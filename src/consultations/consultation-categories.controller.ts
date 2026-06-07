import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsultationCategoryQueryDto } from './dto/consultation-category-query.dto';
import { ConsultationsService } from './consultations.service';

@ApiTags('Consultation Categories')
@Controller('consultation-categories')
export class ConsultationCategoriesController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List active consultation categories.',
    description:
      'Returns active consultation categories only. Use lang=ar or lang=en to choose the localized name field.',
  })
  @ApiOkResponse({ description: 'Active consultation categories returned.' })
  findActive(@Query() query: ConsultationCategoryQueryDto) {
    return this.consultationsService.findActiveCategories(query);
  }
}
