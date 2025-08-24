import { escapeArg } from "@yume-chan/adb";

export function buildArguments<T>(
    commands: readonly string[],
    options: Partial<T> | undefined,
    map: Partial<Record<keyof T, string>>,
): string[] {
    const args = commands.slice();
    if (options) {
        for (const [key, value] of Object.entries(options)) {
            if (value === undefined || value === null) {
                continue;
            }

            const option = map[key as keyof T];
            // Empty string means positional argument,
            // they must be added at the end,
            // so let the caller handle it.
            if (option === undefined || option === "") {
                continue;
            }

            switch (typeof value) {
                case "boolean":
                    if (value) {
                        args.push(option);
                    }
                    break;
                case "number":
                    args.push(option, value.toString());
                    break;
                case "string":
                    args.push(option, escapeArg(value));
                    break;
            }
        }
    }
    return args;
}

export type SingleUser = number | "current";
export type SingleUserOrAll = SingleUser | "all";

export type Optional<T extends object> = { [K in keyof T]?: T[K] | undefined };
