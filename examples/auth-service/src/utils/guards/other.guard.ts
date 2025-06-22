import { Orb } from "@zenith-framework/core";
import type { RequestGuard } from "@zenith-framework/web";
import type { BunRequest } from "bun";

@Orb()
export class OtherGuard implements RequestGuard {
    async accepts(req: BunRequest): Promise<boolean> {
        console.log('OtherGuard.accepts', req);
        return true;
    }
}   