# Zenith framework

This framework aims to make backend development really fast.
It works with an IoC container, scanning the modules in your project to auto-inject `Orbs` where you need them.

An orb is something that you provide to the IoC container to inject (could be a class, or a value, ...).

## Setup

### Blaze

`Blaze` is a starter-pack to accelerate your application bootstrap.
To start, init a new repo and add in `src/index.ts`:
```ts
import { startBlaze } from "@zenith/blaze";
startBlaze(); 
```

This will automatically scan your modules and use a web server.

### Without blaze

Alternatively, to start your first project without blaze, init a new repo and add in `src/index.ts`:
```ts
import { Zenith } from '@zenith/core';
import { ZenithWebSystem } from '@zenith/web';

const zenith = new Zenith();
zenith.with(ZenithWebSystem); // Optional if you don't want to use web server features
await zenith.start();
```

## Install & running examples

To install dependencies:

```bash
bun install
```

To run an example:

```bash
bun run examples/<example>/src/index.ts
```