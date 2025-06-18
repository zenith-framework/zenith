import { HttpRequestDecoder } from "../decorators/http-request-decoder.decorator";
import type { RequestDecoder } from "./request-decoder";

@HttpRequestDecoder(['application/json'])
export class JsonRequestDecoder implements RequestDecoder {
    async decode(request: Request): Promise<any> {
        return await request.json();
    }
}