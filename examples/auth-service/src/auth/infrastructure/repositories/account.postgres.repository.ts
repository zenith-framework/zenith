// import { Injectable } from '@nestjs/common';
// import { TransactionHost } from '@nestjs-cls/transactional';
// import { DrizzleAdapter } from '../../../db';
import { AccountRepository } from '../../domain/account.repository';
import { Account } from '../../domain/entities/account';
import { accountTable } from '../../../db/schema';
import { Orb } from '@zenith-framework/core';

@Orb('AccountRepository')
export class AccountPostgresRepository implements AccountRepository {
  // constructor(private readonly txHost: TransactionHost<DrizzleAdapter>) { }

  async create(account: Account): Promise<void> {
    // await this.txHost.tx.insert(accountTable).values({
    //   id: account.id,
    //   accountId: account.accountId,
    //   providerId: account.providerId,
    //   userId: account.userId,  
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    //   password: account.password,
    // } as typeof accountTable.$inferInsert);
  }
}
