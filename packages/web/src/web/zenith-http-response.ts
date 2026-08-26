import type { HttpException } from "./http-exception";

export interface ZenithHttpResponse {
    status: number;
    body: HttpException;
}