export interface Validator<T> {
    validate(data: unknown, schema: T): Promise<boolean>;
}