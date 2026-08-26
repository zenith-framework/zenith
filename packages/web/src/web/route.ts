import type { RequestGuardOrbProvider } from "./request-guard";

export const RouteMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const;
export type RouteMethod = (typeof RouteMethods)[number];

export interface Route {
    path: string;
    method: RouteMethod;
    guards?: RequestGuardOrbProvider[];
    validated?: boolean;
    validationSchema?: unknown;
    mimeType?: string;
    statusCode?: number;
    openApiResponses?: { status?: number, description?: string, type: unknown }[];
}