import { describe, expect, it } from "bun:test";
import { sanitizePath } from "./path.utils";

describe('path.utils', () => {
    it('should sanitize path', () => {
        expect(sanitizePath('/todos/1')).toBe('todos/1');
        expect(sanitizePath('//todos//1')).toBe('todos/1');
        expect(sanitizePath('todos/1/')).toBe('todos/1');
    });
});