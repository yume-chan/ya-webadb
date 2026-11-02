/* #__NO_SIDE_EFFECTS__ */
export const NOOP = () => {
    // no-op
};

/**
 * When used in `Promise#catch`, means the promise should never throw errors.
 * An explicit way to suppress ESLint floating promise warnings.
 */
export function unreachable(...args: unknown[]): never {
    // Trigger runtime's unhandled rejection event.
    throw new Error("Unreachable. Arguments:\n" + args.join("\n"));
}
