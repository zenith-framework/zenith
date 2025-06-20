import { InjectOrb, Orb } from "@zenith-framework/core";
import type { BaseService } from "./base.service";

@Orb('AService')
export class AService implements BaseService {
    constructor(
        @InjectOrb('BService') private readonly bService: BaseService,
    ) {
    }
}