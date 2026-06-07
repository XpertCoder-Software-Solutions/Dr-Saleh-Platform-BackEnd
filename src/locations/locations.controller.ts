import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LocationsQueryDto } from './dto/locations-query.dto';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('countries')
  @ApiOperation({ summary: 'List active countries.' })
  @ApiOkResponse({ description: 'Active countries returned.' })
  findCountries(@Query() query: LocationsQueryDto) {
    return this.locationsService.findCountries(query);
  }

  @Get('countries/:countryId/cities')
  @ApiOperation({ summary: 'List active cities for one active country.' })
  @ApiOkResponse({ description: 'Active cities returned.' })
  @ApiNotFoundResponse({ description: 'Country not found.' })
  findCities(
    @Param('countryId', ParseUUIDPipe) countryId: string,
    @Query() query: LocationsQueryDto,
  ) {
    return this.locationsService.findCities(countryId, query);
  }
}
