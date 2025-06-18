import { Zenith } from '@zenith/core';
import { ZenithWebSystem } from '@zenith/web';

const zenith = new Zenith();
zenith.with(ZenithWebSystem);
await zenith.start();