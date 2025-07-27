export interface Validator<T> {
    validate(data: any): Promise<boolean>;
    validate(data: any, schema?: T): Promise<boolean>;
}