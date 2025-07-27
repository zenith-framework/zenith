export interface Validator<T> {
    validate(data: any, schema: T): Promise<boolean>;
}