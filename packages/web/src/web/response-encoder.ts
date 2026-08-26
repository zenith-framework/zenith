export interface ResponseEncoder {
    encode(payload: unknown): Promise<string>;
}
