import type { RouteMethod } from "../route";

export interface CorsOptions {
    /**
     * Origins allowed to call the API. `'*'` allows any, and cannot be combined with
     * `credentials` — browsers reject a wildcard origin on a credentialed request, so
     * the response echoes the request origin instead when both are set.
     */
    origins: string[] | '*';
    /** Methods advertised on a preflight. Defaults to every method Zenith routes. */
    methods?: RouteMethod[];
    /** Request headers a client may send. Defaults to echoing what the preflight asks for. */
    allowedHeaders?: string[];
    /** Response headers a browser may read beyond the CORS-safelisted ones. */
    exposedHeaders?: string[];
    /** Whether cookies and Authorization headers may be sent. */
    credentials?: boolean;
    /** How long a browser may cache the preflight, in seconds. */
    maxAgeSeconds?: number;
}
