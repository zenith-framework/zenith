import { Entity, EntityConstructArgs } from '../../../utils/entity';
import { randomUUID } from 'crypto';

export type ProviderId = 'credentials' | 'google';

export interface AccountProps {
  accountId: string;
  userId: string;
  providerId: ProviderId;
  password?: string;
}

export class Account extends Entity<AccountProps> {
  constructor(props: EntityConstructArgs<AccountProps>) {
    super(props);
  }

  static registerWithCredentials({
    userId,
    password,
  }: {
    userId: string;
    password: string;
  }): Account {
    return new Account({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: 'credentials',
      password,
    });
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get providerId(): ProviderId {
    return this.props.providerId;
  }

  get password(): string | undefined {
    return this.props.password;
  }
}
