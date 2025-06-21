import { Body, Controller, Post } from '@zenith/web';
import { LoginWithEmailPasswordUseCase } from '../../application/login-with-email-password.usecase';
import type { SignUpWithEmailPasswordResult } from '../../application/result/sign-up-with-email-password.result';
import { SignUpWithEmailPasswordUseCase } from '../../application/sign-up-with-email-password.usecase';
import { LoginWithEmailPasswordRequest } from './request/login-with-email-password.request';
import { SignUpWithEmailPasswordRequest } from './request/sign-up-with-email-password.request';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly signUpWithEmailPasswordUseCase: SignUpWithEmailPasswordUseCase,
    private readonly loginUserUseCase: LoginWithEmailPasswordUseCase,
  ) { }

  @Post('/sign-up')
  async signUp(
    @Body() command: SignUpWithEmailPasswordRequest,
  ): Promise<SignUpWithEmailPasswordResult> {
    return await this.signUpWithEmailPasswordUseCase.execute(command);
  }

  @Post('/login')
  async login(@Body() command: LoginWithEmailPasswordRequest) {
    return await this.loginUserUseCase.execute(command);
  }
}
