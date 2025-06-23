import { Zenith } from '@zenith-framework/core';
import { ZenithWebSystem } from '@zenith-framework/web';

const zenith = new Zenith();
zenith.with(ZenithWebSystem);
await zenith.start();