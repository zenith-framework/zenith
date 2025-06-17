import { User } from './entities/user';

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<User | undefined>;

  abstract create(user: User): Promise<void>;
}
