import type { BunRequest } from "bun";
import type { Constructor } from "@zenith-framework/core";

export type RequestGuardOrbProvider = Constructor<RequestGuard>;

export interface RequestGuard {
    accepts(req: BunRequest): Promise<boolean>;
}