import type { BunRequest } from "bun";

export type RequestGuardOrbProvider = (...args: any[]) => RequestGuard;

export interface RequestGuard {
    accepts(req: BunRequest): Promise<boolean>;
}