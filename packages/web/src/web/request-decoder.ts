export interface RequestDecoder {
    decode(request: Request): Promise<any>;
}
