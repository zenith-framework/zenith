
import { Session } from './entities/session';
import { randomBytes, randomUUID } from 'crypto';
import { User } from './entities/user';
import { DateTime, Duration } from 'luxon';
import { SessionRepository } from './session.repository';
import { Orb } from '@zenith/core';

// TODO: Move to an external config (env vars ?)
export const SESSION_EXPIRATION_TIME_MS = 1000 * 60 * 60 * 24 * 7;

@Orb()
export class SessionCreator {
  constructor(private readonly sessionRepository: SessionRepository) { }

  async createSession(forUserId: User['id']): Promise<Session> {
    const session = new Session({
      id: randomUUID(),
      userId: forUserId,
      expirationDate: this.computeExpirationDate(),
      token: this.generateToken(),
    });

    await this.sessionRepository.create(session);

    return session;
  }

  private computeExpirationDate(): Date {
    return DateTime.now()
      .plus(Duration.fromMillis(SESSION_EXPIRATION_TIME_MS))
      .toJSDate();
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}
