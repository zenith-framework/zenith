import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';

import { ZenithConfig } from '@zenith-framework/core';
import { DefaultZenithWebConfig } from './default-zenith-web.config';
import { ZENITH_WEB_CORS_ORIGINS } from './config-keys';

const configWith = (values: Record<string, string>) => new DefaultZenithWebConfig(new ZenithConfig(values));

describe('DefaultZenithWebConfig cors()', () => {
    it('is undefined when no origins are configured', () => {
        expect(configWith({}).cors()).toBeUndefined();
    });

    it('treats a blank value as unconfigured rather than an empty allowlist', () => {
        // An empty allowlist would reject every origin, which is not what a stray
        // `ZENITH_WEB_CORS_ORIGINS=` in a .env file means.
        expect(configWith({ [ZENITH_WEB_CORS_ORIGINS]: '   ' }).cors()).toBeUndefined();
    });

    it('reads a wildcard', () => {
        expect(configWith({ [ZENITH_WEB_CORS_ORIGINS]: '*' }).cors()).toEqual({ origins: '*' });
    });

    it('splits and trims a comma-separated allowlist', () => {
        const cors = configWith({ [ZENITH_WEB_CORS_ORIGINS]: 'https://a.example, https://b.example ,' }).cors();

        expect(cors).toEqual({ origins: ['https://a.example', 'https://b.example'] });
    });

    it('defaults the other settings', () => {
        const config = configWith({});

        expect(config.httpServerPort()).toBe(3000);
        expect(config.shutdownTimeoutMs()).toBe(10_000);
        expect(config.generateOpenApiDocs()).toBe(false);
    });
});
