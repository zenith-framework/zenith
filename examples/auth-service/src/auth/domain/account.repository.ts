import { Account } from './entities/account';

export abstract class AccountRepository {
  abstract create(account: Account): Promise<void>;
}
