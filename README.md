# Zenith framework

This framework aims to make backend development really fast.
It works with an IoC container, scanning the modules in your project to auto-inject `Orbs` where you need them.

An orb is something that you provide to the IoC container to inject (could be a class, or a value, ...).

## Setup

### Blaze

`Blaze` is a starter-pack to accelerate your application bootstrap.
To start, init a new repo and add in `src/index.ts`:
```ts
import { startBlaze } from "@zenith-framework/blaze";
await startBlaze();
```

This will automatically scan your modules and use a web server. `startBlaze` returns the
running `Zenith` instance, and takes extra systems to load alongside the web one:

```ts
const zenith = await startBlaze({ with: [MySystem] });
```

### Without blaze

Alternatively, to start your first project without blaze, init a new repo and add in `src/index.ts`:
```ts
import { Zenith } from '@zenith-framework/core';
import { ZenithWebSystem } from '@zenith-framework/web';

const zenith = new Zenith();
zenith.with(ZenithWebSystem); // Optional if you don't want to use web server features
await zenith.start();
```

## Orb lifecycle

Orbs are constructed in dependency order, then initialised in that same order before
any system starts. Implement `OnOrbInit` for work that has to happen before the
application serves traffic, and `OnOrbDestroy` to release what it holds.

```ts
import { Orb, type OnOrbDestroy, type OnOrbInit } from '@zenith-framework/core';

@Orb()
export class ConnectionPool implements OnOrbInit, OnOrbDestroy {
    async onInit() {
        await this.connect();   // every orb this one depends on is already initialised
    }

    async onDestroy() {
        await this.close();
    }
}
```

`onInit` runs dependencies-first, so an orb can use anything it injected. A failing
`onInit` aborts startup. `onDestroy` runs in reverse on `SIGINT`/`SIGTERM`, after the
systems have stopped, so an orb is released before the orbs it depends on. A failing
`onDestroy` is logged and the remaining orbs are still destroyed.

See `examples/lifecycle` for a runnable version.

## Systems

A system is a unit of framework capability: a directory of orbs plus a lifecycle.
`ZenithWebSystem` is one. Systems are ordinary orbs, so they declare what they need
through their constructor.

```ts
import { Orb, ZenithSystem } from '@zenith-framework/core';

@Orb()
export class MySystem extends ZenithSystem {
    static readonly root = import.meta.dirname;   // scanned for the orbs this system provides

    constructor(private readonly somethingFromMyDirectory: Thing) {
        super();
    }

    async onStart() { }
    async onStop() { }
}
```

Load it with `zenith.with(MySystem)`, or `startBlaze({ with: [MySystem] })`.

To make a system configurable, have it inject a named config and let projects override
it by declaring their own class under the same name:

```ts
@Config('MySystemConfig')
export class MyConfig extends MySystemConfig {
    endpoint() { return 'https://example.com'; }
}
```

## Name collisions

Because orbs are discovered by scanning rather than declared in an imports list, two
classes sharing a name would silently overwrite each other. Zenith refuses this at
startup and names both files. Rename one with `@Orb('AnotherName')`.

Configs are the exception: declaring a `@Config` under an existing name replaces it,
which is how a project overrides a system's defaults.

## Install & running examples

To install dependencies:

```bash
bun install
```

To run an example:

```bash
bun run examples/<example>/src/index.ts
```