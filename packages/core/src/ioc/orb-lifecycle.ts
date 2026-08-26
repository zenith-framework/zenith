/**
 * Implemented by orbs that need to do asynchronous work before the application starts.
 *
 * `onInit` runs after the whole graph has been constructed, in dependency order:
 * an orb is initialised only once every orb it depends on has been initialised, so
 * it can safely use them. A failing `onInit` aborts startup.
 */
export interface OnOrbInit {
    onInit(): void | Promise<void>;
}

/**
 * Implemented by orbs that hold resources to release on shutdown.
 *
 * `onDestroy` runs in reverse initialisation order, so an orb is destroyed before
 * the orbs it depends on. Failures are logged and do not stop the remaining orbs
 * from being destroyed.
 */
export interface OnOrbDestroy {
    onDestroy(): void | Promise<void>;
}

export function hasOnInit(value: unknown): value is OnOrbInit {
    return typeof (value as OnOrbInit | null)?.onInit === 'function';
}

export function hasOnDestroy(value: unknown): value is OnOrbDestroy {
    return typeof (value as OnOrbDestroy | null)?.onDestroy === 'function';
}
