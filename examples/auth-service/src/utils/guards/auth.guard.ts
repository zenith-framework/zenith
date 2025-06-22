import { Orb } from "@zenith-framework/core";
import type { RequestGuard } from "@zenith-framework/web";
import type { BunRequest } from "bun";

@Orb()
export class AuthGuard implements RequestGuard {
    async accepts(req: BunRequest): Promise<boolean> {
        console.log('AuthGuard.accepts', req);
        return true;
    }
}   