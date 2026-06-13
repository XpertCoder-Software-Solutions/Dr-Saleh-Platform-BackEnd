import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/services/password.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserAddressesController } from './user-addresses.controller';
import { UserAddressesService } from './user-addresses.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [NotificationsModule],
  controllers: [UsersController, UserAddressesController],
  providers: [UsersService, UserAddressesService, PasswordService],
})
export class UsersModule {}
