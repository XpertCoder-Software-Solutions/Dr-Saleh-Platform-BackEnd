import { PartialType } from '@nestjs/swagger';
import { CreateBookFormatDto } from './create-book-format.dto';

export class UpdateBookFormatDto extends PartialType(CreateBookFormatDto) {}
