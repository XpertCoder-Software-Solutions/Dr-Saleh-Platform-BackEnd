import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePaymobPaymentDto } from './dto/create-paymob-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments - Paymob')
@Controller('payments/paymob')
export class PaymobPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a Paymob checkout (card, wallet or Apple Pay).',
    description:
      'Creates a payment intention for an owned pending EGP order and returns the Unified Checkout URL.',
  })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymobPaymentDto,
  ) {
    return this.paymentsService.createPaymobPayment(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paymob transaction processed callback.',
    description:
      'Verifies the HMAC sent in the `hmac` query parameter, then applies the payment status idempotently.',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  webhook(@Body() body: Record<string, unknown>, @Query('hmac') hmac?: string) {
    return this.paymentsService.handlePaymobWebhook(body, hmac);
  }

  @Post('return')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Confirm the buyer redirect from Paymob.',
    description:
      'Send the query parameters Paymob added to the redirection URL. The HMAC is verified before anything is updated.',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: 'Payment status after the redirect.' })
  confirmReturn(
    @CurrentUser('id') userId: string,
    @Body() query: Record<string, unknown>,
  ) {
    return this.paymentsService.confirmPaymobReturn(userId, query);
  }

  @Get('status/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Paymob payment status for an owned order.' })
  status(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.getPaymobStatus(userId, orderId);
  }
}
