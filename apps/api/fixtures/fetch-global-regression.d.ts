export {}

// Reproduce Node's conditional fetch types during the platform's second
// compilation: worker-like globals without DOM declarations must also compile.
declare global { var onmessage: unknown }
