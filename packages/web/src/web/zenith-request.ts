import type { BunRequest } from "bun";
import type { ZenithRequestRouting } from "./zenith-request-routing";

export interface ZenithRequest {
    bunRequest: BunRequest;
    fullPath: string;
    routing: ZenithRequestRouting;
}