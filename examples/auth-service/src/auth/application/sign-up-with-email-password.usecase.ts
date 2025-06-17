import { UserAlreadyExistsError } from '../domain/errors/user-already-exists.error';
import { UserRepository } from '../domain/user.repository';
import { User } from '../domain/entities/user';
import { randomUUID } from 'crypto';
import { AccountRepository } from '../domain/account.repository';
import { Account } from '../domain/entities/account';
// import { Transactional } from '../../db/transactional.decorator';
import type { SignUpWithEmailPasswordCommand } from './command/sign-up-with-email-password.command';
import type { SignUpWithEmailPasswordResult } from './result/sign-up-with-email-password.result';
import { SessionCreator } from '../domain/session-creator';
import { Orb } from '@zenith/core';

@Orb()
export class SignUpWithEmailPasswordUseCase {
  constructor(
    private readonly sessionCreator: SessionCreator,
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
  ) { }

  // @Transactional()
  async execute(
    command: SignUpWithEmailPasswordCommand,
  ): Promise<SignUpWithEmailPasswordResult> {
    const user = await this.userRepository.findByEmail(command.email);

    if (user) {
      await Bun.password.hash('dummy password', 'argon2id');
      throw new UserAlreadyExistsError();
    }

    const newUser = await this.createUser(command);
    const hashedPassword = await Bun.password.hash(command.password, 'argon2id');
    await this.createAccount(newUser, hashedPassword);
    const session = await this.sessionCreator.createSession(newUser.id);

    return {
      token: session.token,
      user: {
        id: newUser.id,
      },
    };
  }

  private async createAccount(newUser: User, hashedPassword: string) {
    const newAccount = Account.registerWithCredentials({
      userId: newUser.id,
      password: hashedPassword,
    });
    await this.accountRepository.create(newAccount);
  }

  private async createUser(command: SignUpWithEmailPasswordCommand) {
    const newUser = new User({
      id: randomUUID(),
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName,
    });
    await this.userRepository.create(newUser);
    return newUser;
  }
}
