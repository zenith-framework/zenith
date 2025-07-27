import 'reflect-metadata';

import { Zenith } from "@zenith-framework/core";
import { ZenithWebSystem } from "@zenith-framework/web";

const zenith = new Zenith().with(ZenithWebSystem);
await zenith.start();
