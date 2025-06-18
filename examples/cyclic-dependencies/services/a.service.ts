import { InjectOrb, Orb } from "@zenith/core";
import type { BaseService } from "./base.service";

@Orb('AService')
export class AService implements BaseService {
    constructor(
        @InjectOrb('BService') private readonly bService: BaseService,
    ) {
    }
}