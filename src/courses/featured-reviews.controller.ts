import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { FeaturedReviewQueryDto } from './dto/admin-review-query.dto';

@ApiTags('Course Reviews')
@Controller('course-reviews')
export class FeaturedReviewsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('featured')
  @ApiOperation({
    summary: 'Best recent reviews across all courses (for the home page).',
    description:
      'Shown reviews with 4+ stars and a written comment, newest first.',
  })
  @ApiOkResponse({ description: 'Reviews returned.' })
  findFeatured(@Query() query: FeaturedReviewQueryDto) {
    return this.coursesService.findFeaturedReviews(query.limit ?? 6);
  }
}
