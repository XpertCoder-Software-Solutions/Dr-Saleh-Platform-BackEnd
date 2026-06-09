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
  Request,
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
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import {
  UserAddressApiResponseDto,
  UserAddressDeleteApiResponseDto,
  UserAddressListApiResponseDto,
} from './dto/user-address-response.dto';
import { UserAddressesService } from './user-addresses.service';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

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
  findAll(@Request() request: AuthenticatedRequest) {
    return this.userAddressesService.findAll(request.user.id);
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
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userAddressesService.findOne(request.user.id, id);
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
    @Request() request: AuthenticatedRequest,
    @Body() createUserAddressDto: CreateUserAddressDto,
  ) {
    return this.userAddressesService.create(
      request.user.id,
      createUserAddressDto,
    );
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
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserAddressDto: UpdateUserAddressDto,
  ) {
    return this.userAddressesService.update(
      request.user.id,
      id,
      updateUserAddressDto,
    );
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
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userAddressesService.delete(request.user.id, id);
  }
}
