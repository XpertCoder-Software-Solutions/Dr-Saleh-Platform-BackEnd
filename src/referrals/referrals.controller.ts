import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplyReferralCodeDto } from './dto/apply-referral-code.dto';
import { ReferralQueryDto } from './dto/referral-query.dto';
import {
  ReferralApiResponseDto,
  ReferralCodeApiResponseDto,
  ReferralListApiResponseDto,
} from './dto/referral-response.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('my-code')
  @ApiOperation({
    summary: 'Get current user referral code.',
    description:
      'Creates a unique referral code for the user if one does not already exist.',
  })
  @ApiOkResponse({
    description: 'Referral code returned successfully.',
    type: ReferralCodeApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  getMyCode(@CurrentUser('id') userId: string) {
    return this.referralsService.getMyCode(userId);
  }

  @Get('my-referrals')
  @ApiOperation({
    summary: 'Get current user referrals.',
    description: 'Returns paginated users referred by the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Referrals returned successfully.',
    type: ReferralListApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findMyReferrals(
    @CurrentUser('id') userId: string,
    @Query() query: ReferralQueryDto,
  ) {
    return this.referralsService.findMyReferrals(userId, query);
  }

  @Post('apply-code')
  @ApiOperation({
    summary: 'Apply referral code to current user.',
    description:
      'Users can apply a referral code only before they have a referrer and before they place a paid order.',
  })
  @ApiOkResponse({
    description: 'Referral code applied successfully.',
    type: ReferralApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid referral code payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Referral code not found.' })
  @ApiConflictResponse({
    description:
      'User cannot refer himself, is already referred, or has already paid an order.',
  })
  applyCode(
    @CurrentUser('id') userId: string,
    @Body() applyReferralCodeDto: ApplyReferralCodeDto,
  ) {
    return this.referralsService.applyCode(userId, applyReferralCodeDto);
  }
}
