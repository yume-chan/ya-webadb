export function buildArguments<T>(
    commands: readonly string[],
    options: Partial<T> | undefined,
    map: Partial<Record<keyof T, string>>,
): string[] {
    const args = commands.slice();
    if (options) {
        for (const [key, value] of Object.entries(options)) {
            if (value) {
                const option = map[key as keyof T];
                if (option) {
                    args.push(option);
                    switch (typeof value) {
                        case "number":
                            args.push(value.toString());
                            break;
                        case "string":
                            args.push(value);
                            break;
                    }
                }
            }
        }
    }
    return args;
}

export type SingleUser = number | "current";
export type SingleUserOrAll = SingleUser | "all";
