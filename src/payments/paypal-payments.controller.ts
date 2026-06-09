import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { CreatePaypalPaymentDto } from './dto/create-paypal-payment.dto';
import {
  PaypalCreatePaymentApiResponseDto,
  PaypalStatusApiResponseDto,
  PaypalWebhookApiResponseDto,
} from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Payments - PayPal')
@Controller('payments/paypal')
export class PaypalPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a PayPal Checkout order.',
    description:
      'Creates or returns the current pending PayPal Checkout order for an owned pending USD order.',
  })
  @ApiCreatedResponse({
    description: 'PayPal order created successfully.',
    type: PaypalCreatePaymentApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid orderId, non-USD order, or invalid order amount.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiConflictResponse({
    description:
      'Order is not pending, payment status is not pending, already paid, or another active payment exists.',
  })
  @ApiBadGatewayResponse({ description: 'PayPal request failed.' })
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createPaypalPaymentDto: CreatePaypalPaymentDto,
  ) {
    return this.paymentsService.createPaypalPayment(
      request.user.id,
      createPaypalPaymentDto,
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PayPal payment webhook.',
    description:
      'Verifies PayPal webhook headers with PayPal, then applies payment status idempotently.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @ApiOkResponse({
    description: 'PayPal webhook processed successfully.',
    type: PaypalWebhookApiResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Invalid PayPal webhook signature.' })
  @ApiNotFoundResponse({ description: 'PayPal payment not found.' })
  @ApiBadGatewayResponse({ description: 'PayPal verification request failed.' })
  webhook(
    @Headers() headers: Record<string, unknown>,
    @Body() webhookEvent: Record<string, unknown>,
  ) {
    return this.paymentsService.handlePaypalWebhook(headers, webhookEvent);
  }

  @Get('status/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Pull PayPal payment status for an owned order.',
    description:
      'Backend verifies status directly from PayPal and never trusts frontend payment status.',
  })
  @ApiOkResponse({
    description: 'PayPal payment status returned successfully.',
    type: PaypalStatusApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'PayPal payment not found.' })
  @ApiConflictResponse({ description: 'PayPal order id is not available.' })
  @ApiBadGatewayResponse({ description: 'PayPal request failed.' })
  status(
    @Request() request: AuthenticatedRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.pullPaypalStatus(request.user.id, orderId);
  }
}
