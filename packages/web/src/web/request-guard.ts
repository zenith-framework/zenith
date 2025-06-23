import type { BunRequest } from "bun";

export type RequestGuardOrbProvider = new (...args: any[]) => RequestGuard;

export interface RequestGuard {
    accepts(req: BunRequest): Promise<boolean>;
}