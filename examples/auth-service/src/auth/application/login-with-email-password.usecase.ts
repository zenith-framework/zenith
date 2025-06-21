import { UserRepository } from '../domain/user.repository';
import { SessionCreator } from '../domain/session-creator';
import { BadCredentialsError } from '../domain/errors/bad-credentials.error';
import type { LoginWithEmailPasswordCommand } from './command/login-with-email-password.command';
import type { LoginWithEmailPasswordResult } from './result/login-with-email-password.result';
import { Orb } from '@zenith-framework/core';

@Orb()
export class LoginWithEmailPasswordUseCase {
  constructor(
    private readonly sessionCreator: SessionCreator,
    private readonly userRepository: UserRepository,
  ) { }

  // @Transactional()
  async execute(
    command: LoginWithEmailPasswordCommand,
  ): Promise<LoginWithEmailPasswordResult> {
    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      const hash = await Bun.password.hash('dummy password');
      await Bun.password.verify('dummy password 2', hash);
      throw new BadCredentialsError();
    }

    const hashedPassword = await Bun.password.hash(command.password);
    const passwordVerified = await Bun.password.verify(
      hashedPassword,
      command.password,
      'argon2id'
    );

    if (!passwordVerified) {
      throw new BadCredentialsError();
    }

    const session = await this.sessionCreator.createSession(user.id);

    return {
      token: session.token,
      user: {
        id: user.id,
      },
    };
  }
}
