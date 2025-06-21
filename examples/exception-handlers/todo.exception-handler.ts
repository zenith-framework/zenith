import { Catch, ExceptionHandler, HttpException } from "@zenith-framework/web";
import { TodoNotFoundError } from "./controllers/todo/todo.controller";

@ExceptionHandler
export class TodoExceptionHandler {

    @Catch(TodoNotFoundError)
    handleTodoNotFoundError(error: TodoNotFoundError): HttpException {
        return new HttpException(404, error.message);
    }
}   