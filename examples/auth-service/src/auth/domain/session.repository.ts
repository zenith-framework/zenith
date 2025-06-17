import { Session } from './entities/session';

export abstract class SessionRepository {
  abstract create(session: Session): Promise<void>;
}
