import { HttpResponseEncoder } from "../decorators/http-response-encoder.decorator";
import type { ResponseEncoder } from "./response-encoder";

@HttpResponseEncoder(['application/json'])
export class JsonResponseEncoder implements ResponseEncoder {
    async encode(payload: unknown): Promise<string> {
        return JSON.stringify(payload);
    }
}