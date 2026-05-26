class ApiError extends Error {
    constructor(statusCode, message="Something went wrong", errors = [], stack=""){
        // override jb bhi krte h tb hum super call krte he h
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = this.errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}