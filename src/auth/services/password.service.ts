import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(refreshToken, PASSWORD_SALT_ROUNDS);
  }

  compareRefreshToken(refreshToken: string, hash: string): Promise<boolean> {
    return bcrypt.compare(refreshToken, hash);
  }
}
