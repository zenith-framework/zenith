import { declareOrb, setOrbType } from "@zenith-framework/core";
import type { Constructor, DecoratorTarget } from "@zenith-framework/core";
import { ZENITH_EXCEPTION_HANDLER_EXCEPTIONS, ZENITH_ORB_TYPE_EXCEPTION_HANDLER } from "./metadata-keys";

/**
 * Decorator to handle exceptions not catched by the controller.
 * 
 * The exception handler is a function that will be called when an exception is thrown.
 * The function must return a response.
 * 
 * @param exceptions - The exception or exceptions to handle.
 * @returns A decorator function.
 */
export const ExceptionHandler = (target: Constructor) => {
    declareOrb(target);
    setOrbType(target, ZENITH_ORB_TYPE_EXCEPTION_HANDLER);
};

export const Catch = (...exceptions: Constructor[]) => (target: DecoratorTarget, propertyKey: string) => {
    Reflect.defineMetadata(ZENITH_EXCEPTION_HANDLER_EXCEPTIONS, exceptions, target, propertyKey);
};