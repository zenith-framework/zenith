import { Entity, type EntityConstructArgs } from '../../../utils/entity';

export interface UserProps {
  email: string;
  firstName: string;
  lastName: string;
}

export class User extends Entity<UserProps> {
  constructor(props: EntityConstructArgs<UserProps>) {
    super(props);
  }

  get email(): string {
    return this.props.email;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }
}
