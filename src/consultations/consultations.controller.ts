import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationRequestDto } from './dto/create-consultation-request.dto';

@ApiTags('Consultations')
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a free consultation request without login.',
  })
  @ApiCreatedResponse({
    description: 'Consultation request submitted successfully.',
    schema: {
      example: {
        success: true,
        message:
          'Consultation request submitted successfully. We will contact you as soon as possible.',
        data: {},
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid body or inactive consultation category.',
  })
  submit(@Body() createConsultationRequestDto: CreateConsultationRequestDto) {
    return this.consultationsService.submitRequest(
      createConsultationRequestDto,
    );
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      "List the signed-in user's consultation requests (matched by email).",
  })
  @ApiOkResponse({ description: 'Consultation requests returned.' })
  findMine(@CurrentUser('email') email: string) {
    return this.consultationsService.findMyRequests(email);
  }
}
