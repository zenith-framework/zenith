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
startBlaze(); 
```

This will automatically scan your modules and use a web server.

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

## Install & running examples

To install dependencies:

```bash
bun install
```

To run an example:

```bash
bun run examples/<example>/src/index.ts
```