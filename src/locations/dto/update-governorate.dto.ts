import { PartialType } from '@nestjs/swagger';
import { CreateGovernorateDto } from './create-governorate.dto';

export class UpdateGovernorateDto extends PartialType(CreateGovernorateDto) {}
