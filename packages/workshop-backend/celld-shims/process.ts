export const nextTick = (fn: (...a: unknown[]) => void, ...args: unknown[]) => {
  queueMicrotask(() => fn(...args));
};
export const browser = true;
export const env: Record<string, string> = {};
export const platform = "browser";
export const versions: Record<string, string> = {};
export const cwd = () => "/";
export const argv: string[] = [];
export default { nextTick, browser, env, platform, versions, cwd, argv };
