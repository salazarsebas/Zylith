// Stubs for Node.js builtins imported by SDK's ClientProver module.
// These are never executed at runtime — the frontend uses ASP mode exclusively.
// They exist only to satisfy Rollup's static analysis during build.

// path module
export const resolve = (...args: string[]) => args.join("/");
export const dirname = (p: string) => p.split("/").slice(0, -1).join("/");
export const join = (...args: string[]) => args.join("/");

// url module
export const fileURLToPath = (url: string) => url.replace("file://", "");

// fs/promises module
export const readFile = async () => "";
export const access = async () => {};
export const writeFile = async () => {};
export const mkdir = async () => {};
export const stat = async () => ({});
export const readdir = async () => [];

export default { resolve, dirname, join, fileURLToPath, readFile, access, writeFile, mkdir, stat, readdir };
