/**
 * Decorator to handle exceptions not catched by the controller.
 * 
 * The exception handler is a function that will be called when an exception is thrown.
 * The function must return a response.
 * 
 * @param exceptions - The exception or exceptions to handle.
 * @returns A decorator function.
 */

export const ExceptionHandler = (target: any) => {
    // console.log('ExceptionHandler', target);
};

export const Catch = (exception: Function) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // console.log('Catch', exception, target, propertyKey, descriptor);
};