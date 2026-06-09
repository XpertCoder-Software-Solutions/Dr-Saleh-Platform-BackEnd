import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminReferralQueryDto } from './dto/referral-query.dto';
import {
  ReferralApiResponseDto,
  ReferralListApiResponseDto,
} from './dto/referral-response.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('Admin Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list referrals.',
    description:
      'Supports pagination plus referrerUserId, referredUserId, and isRewarded filters.',
  })
  @ApiOkResponse({
    description: 'Referrals returned successfully.',
    type: ReferralListApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query filters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminReferralQueryDto) {
    return this.referralsService.adminFindAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one referral.' })
  @ApiOkResponse({
    description: 'Referral returned successfully.',
    type: ReferralApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Referral not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralsService.adminFindOne(id);
  }
}
