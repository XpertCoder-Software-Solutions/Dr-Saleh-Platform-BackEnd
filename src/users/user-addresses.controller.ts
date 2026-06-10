import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import {
  UserAddressApiResponseDto,
  UserAddressDeleteApiResponseDto,
  UserAddressListApiResponseDto,
} from './dto/user-address-response.dto';
import { UserAddressesService } from './user-addresses.service';

@ApiTags('User Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List current user addresses.' })
  @ApiOkResponse({
    description: 'Current user addresses returned.',
    type: UserAddressListApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findAll(@CurrentUser('id') userId: string) {
    return this.userAddressesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one current user address.' })
  @ApiOkResponse({
    description: 'Address returned.',
    type: UserAddressApiResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Address not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userAddressesService.findOne(userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an address for the current user.' })
  @ApiCreatedResponse({
    description: 'Address created successfully.',
    type: UserAddressApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid governorate or request body.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createUserAddressDto: CreateUserAddressDto,
  ) {
    return this.userAddressesService.create(userId, createUserAddressDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one current user address.' })
  @ApiOkResponse({
    description: 'Address updated successfully.',
    type: UserAddressApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid governorate, request body, or no update fields.',
  })
  @ApiNotFoundResponse({ description: 'Address not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserAddressDto: UpdateUserAddressDto,
  ) {
    return this.userAddressesService.update(userId, id, updateUserAddressDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete one current user address.' })
  @ApiOkResponse({
    description: 'Address deleted successfully.',
    type: UserAddressDeleteApiResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Address not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userAddressesService.delete(userId, id);
  }
}
