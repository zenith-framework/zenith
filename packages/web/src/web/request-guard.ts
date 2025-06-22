import type { BunRequest } from "bun";

export type RequestGuardOrbProvider = (string | (new (...args: any[]) => RequestGuard));

export interface RequestGuard {
    accepts(req: BunRequest): Promise<boolean>;
}