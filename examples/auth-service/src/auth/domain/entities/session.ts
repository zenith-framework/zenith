import { Entity, EntityConstructArgs } from '../../../utils/entity';
import { User } from './user';

export interface SessionProps {
  expirationDate: Date;
  token: string;
  userId: User['id'];
}

export class Session extends Entity<SessionProps> {
  constructor(props: EntityConstructArgs<SessionProps>) {
    super(props);
  }

  get token(): string {
    return this.props.token;
  }

  get expirationDate(): Date {
    return this.props.expirationDate;
  }

  get userId(): User['id'] {
    return this.props.userId;
  }
}
