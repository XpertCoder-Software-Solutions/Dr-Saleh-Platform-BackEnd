import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateFawryPaymentDto } from './dto/create-fawry-payment.dto';
import { FawryWebhookDto } from './dto/fawry-webhook.dto';
import {
  FawryCreatePaymentApiResponseDto,
  FawryStatusApiResponseDto,
  FawryWebhookApiResponseDto,
} from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Payments - Fawry')
@Controller('payments/fawry')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a Fawry reference payment request.',
    description:
      'Creates or returns the current pending Fawry reference for an owned pending order. Direct card details are not accepted here.',
  })
  @ApiCreatedResponse({
    description: 'Fawry payment request created successfully.',
    type: FawryCreatePaymentApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid orderId or order amount.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiConflictResponse({
    description: 'Order is not pending, already paid, or payment exists.',
  })
  @ApiBadGatewayResponse({ description: 'Fawry request failed.' })
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createFawryPaymentDto: CreateFawryPaymentDto,
  ) {
    return this.paymentsService.createFawryPayment(
      request.user.id,
      createFawryPaymentDto,
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fawry payment notification webhook.',
    description:
      'Verifies the Fawry message signature and applies payment status idempotently.',
  })
  @ApiOkResponse({
    description: 'Fawry webhook processed successfully.',
    type: FawryWebhookApiResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Invalid Fawry webhook signature.' })
  @ApiNotFoundResponse({ description: 'Payment not found.' })
  webhook(@Body() fawryWebhookDto: FawryWebhookDto) {
    return this.paymentsService.handleFawryWebhook(fawryWebhookDto);
  }

  @Get('status/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Pull Fawry payment status for an owned order.',
    description:
      'Backend verifies status directly from Fawry and never trusts frontend payment status.',
  })
  @ApiOkResponse({
    description: 'Fawry payment status returned successfully.',
    type: FawryStatusApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Fawry payment not found.' })
  @ApiBadGatewayResponse({ description: 'Fawry request failed.' })
  status(
    @Request() request: AuthenticatedRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.pullFawryStatus(request.user.id, orderId);
  }

  @Patch('cancel/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cancel an unpaid Fawry payment/order.',
    description:
      'Calls Fawry cancel unpaid order API and marks the local payment/order as CANCELLED.',
  })
  @ApiOkResponse({
    description: 'Fawry payment cancelled successfully.',
    type: FawryStatusApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Fawry payment not found.' })
  @ApiConflictResponse({
    description: 'Payment is already paid or has no Fawry reference.',
  })
  @ApiBadGatewayResponse({ description: 'Fawry cancel request failed.' })
  cancel(
    @Request() request: AuthenticatedRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.cancelFawryPayment(request.user.id, orderId);
  }
}
