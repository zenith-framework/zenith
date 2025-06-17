import { UserRepository } from '../../domain/user.repository';
import { User } from '../../domain/entities/user';
import { accountTable, userTable } from '../../../db/schema';
import { eq } from 'drizzle-orm';
// import { TransactionHost } from '@nestjs-cls/transactional';
// import { DrizzleAdapter } from '../../../db';
import { Orb } from '@zenith/core';

@Orb('UserRepository')
export class UserPostgresRepository implements UserRepository {
  // constructor(private readonly txHost: TransactionHost<DrizzleAdapter>) {}

  async findByEmail(email: string): Promise<User | undefined> {
    return undefined;
    // const res = await this.txHost.tx
    //   .select()
    //   .from(userTable)
    //   .leftJoin(accountTable, eq(accountTable.userId, userTable.id))
    //   .where(eq(userTable.email, email));

    // if (res.length < 1) {
    //   return undefined;
    // }

    // return new User({
    //   id: res[0].auth_user.id, 
    //   email: res[0].auth_user.email,
    //   firstName: res[0].auth_user.firstName,
    //   lastName: res[0].auth_user.lastName,
    // });
  }

  async create(user: User): Promise<void> {
    // await this.txHost.tx.insert(userTable).values({
    //   id: user.id,
    //   email: user.email,
    //   firstName: user.firstName,
    //   lastName: user.lastName,
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    // });
  }
}
