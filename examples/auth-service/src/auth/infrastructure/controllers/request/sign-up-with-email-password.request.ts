import { IsEmail, IsNotEmpty } from 'class-validator';
import { SignUpWithEmailPasswordCommand } from '../../../application/command/sign-up-with-email-password.command';

export class SignUpWithEmailPasswordRequest
  implements SignUpWithEmailPasswordCommand
{
  @IsEmail()
  email: string;
  @IsNotEmpty()
  password: string;
  @IsNotEmpty()
  firstName: string;
  @IsNotEmpty()
  lastName: string;
}
