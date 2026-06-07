import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';

@Module({
  imports: [EmailModule, PassportModule],
  controllers: [AuthController],
  providers: [AuthService, OtpService, PasswordService, JwtStrategy],
})
export class AuthModule {}
