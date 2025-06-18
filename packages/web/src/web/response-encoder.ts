export interface ResponseEncoder {
    encode(payload: any): Promise<string>;
}
