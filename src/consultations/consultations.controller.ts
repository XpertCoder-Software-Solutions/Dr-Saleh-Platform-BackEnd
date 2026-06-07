import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
}
