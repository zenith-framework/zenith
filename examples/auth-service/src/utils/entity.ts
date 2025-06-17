export type EntityConstructArgs<TProps> = { id: string } & TProps;

export abstract class Entity<TProps> {
  private readonly _id: string; // Maybe we want to specify the type for ID
  protected props: TProps;

  protected constructor(props: EntityConstructArgs<TProps>) {
    this._id = props.id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }
}
