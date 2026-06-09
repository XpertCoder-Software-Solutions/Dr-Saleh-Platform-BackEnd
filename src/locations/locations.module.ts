import { Module } from '@nestjs/common';
import { AdminGovernoratesController } from './admin-governorates.controller';
import { GovernoratesController } from './governorates.controller';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [
    LocationsController,
    GovernoratesController,
    AdminGovernoratesController,
  ],
  providers: [LocationsService],
})
export class LocationsModule {}
