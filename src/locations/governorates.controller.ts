import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GovernorateListApiResponseDto } from './dto/governorate-response.dto';
import { LocationsQueryDto } from './dto/locations-query.dto';
import { LocationsService } from './locations.service';

@ApiTags('Governorates')
@Controller('governorates')
export class GovernoratesController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List active governorates available for shipping.',
  })
  @ApiOkResponse({
    description: 'Governorates returned successfully.',
    type: GovernorateListApiResponseDto,
  })
  findAll(@Query() query: LocationsQueryDto) {
    return this.locationsService.findGovernorates(query);
  }
}
