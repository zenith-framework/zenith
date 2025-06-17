// import { TransactionHost } from '@nestjs-cls/transactional';
// import { DrizzleAdapter } from '../../../db';
import { sessionTable } from '../../../db/schema';
import { SessionRepository } from '../../domain/session.repository';
import { Session } from '../../domain/entities/session';
import { Orb } from '@zenith/core';

@Orb('SessionRepository')
export class SessionPostgresRepository implements SessionRepository {
  // constructor(private readonly txHost: TransactionHost<DrizzleAdapter>) {}

  async create(session: Session): Promise<void> {
    // await this.txHost.tx.insert(sessionTable).values({
    //   id: session.id,
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    //   userId: session.userId,
    //   expiresAt: session.expirationDate,
    //   token: session.token,
    // } as typeof sessionTable.$inferInsert);
  }
}
