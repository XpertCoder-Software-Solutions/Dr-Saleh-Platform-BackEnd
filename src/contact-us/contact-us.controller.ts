import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ContactUsService } from './contact-us.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@ApiTags('Contact Us')
@Controller('contact-us')
export class ContactUsController {
  constructor(private readonly contactUsService: ContactUsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a public contact message.' })
  @ApiCreatedResponse({
    description: 'Contact message submitted successfully.',
    schema: {
      example: {
        success: true,
        message:
          'Your message has been received successfully. We will contact you as soon as possible.',
        data: {},
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  submit(@Body() createContactMessageDto: CreateContactMessageDto) {
    return this.contactUsService.submit(createContactMessageDto);
  }
}
