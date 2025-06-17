import { IsEmail, IsNotEmpty } from 'class-validator';
import { LoginWithEmailPasswordCommand } from '../../../application/command/login-with-email-password.command';

export class LoginWithEmailPasswordRequest
  implements LoginWithEmailPasswordCommand
{
  @IsEmail()
  email: string;
  @IsNotEmpty()
  password: string;
}
