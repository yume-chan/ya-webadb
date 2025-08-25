// cspell: ignore eial
// cspell: ignore elal
// cspell: ignore efal
// cspell: ignore esal
// cspell: ignore edal

export interface IntentNumberExtra {
    type: "long" | "float" | "double";
    value: number;
}

export interface IntentStringExtra {
    type: "uri";
    value: string;
}

export interface IntentArrayListExtra {
    type: "arrayList";
    value: number[] | IntentNumberExtra[] | string[];
}

export interface ComponentName {
    packageName: string;
    className: string;
}

export interface Intent {
    action?: string | undefined;
    data?: string | undefined;
    type?: string | undefined;
    identifier?: string | undefined;
    categories?: string[] | undefined;
    extras?:
        | Record<
              string,
              | string
              | null
              | number
              | IntentStringExtra
              | ComponentName
              | number[]
              | IntentArrayListExtra
              | IntentNumberExtra
              | IntentNumberExtra[]
              | string[]
              | boolean
          >
        | undefined;
    flags?: number | undefined;
    package?: string | undefined;
    component?: ComponentName | undefined;
}

export function serializeIntent(intent: Intent) {
    const result: string[] = [];

    if (intent.action) {
        result.push("-a", intent.action);
    }

    if (intent.data) {
        result.push("-d", intent.data);
    }

    if (intent.type) {
        result.push("-t", intent.type);
    }

    if (intent.identifier) {
        result.push("-i", intent.identifier);
    }

    if (intent.categories) {
        for (const category of intent.categories) {
            result.push("-c", category);
        }
    }

    if (intent.extras) {
        for (const [key, value] of Object.entries(intent.extras)) {
            switch (typeof value) {
                case "string":
                    result.push("--es", key, value);
                    break;
                case "object":
                    if (value === null) {
                        result.push("--esn", key);
                        break;
                    }

                    if (Array.isArray(value)) {
                        if (value.length === 0) {
                            throw new Error(
                                "Intent extra array cannot be empty",
                            );
                        }

                        switch (typeof value[0]) {
                            case "number":
                                result.push(
                                    "--eia",
                                    key,
                                    (value as number[]).join(","),
                                );
                                break;
                            case "object":
                                switch (value[0].type) {
                                    case "long":
                                        result.push(
                                            "--ela",
                                            key,
                                            (value as IntentNumberExtra[])
                                                .map((item) => item.value)
                                                .join(","),
                                        );
                                        break;
                                    case "float":
                                        result.push(
                                            "--efa",
                                            key,
                                            (value as IntentNumberExtra[])
                                                .map((item) => item.value)
                                                .join(","),
                                        );
                                        break;
                                    case "double":
                                        result.push(
                                            "--eda",
                                            key,
                                            (value as IntentNumberExtra[])
                                                .map((item) => item.value)
                                                .join(","),
                                        );
                                        break;
                                }
                                break;
                            case "string":
                                result.push(
                                    "--esa",
                                    key,
                                    (value as string[])
                                        .map((item) =>
                                            item.replaceAll(",", "\\,"),
                                        )
                                        .join(","),
                                );
                                break;
                        }
                        break;
                    }

                    if ("packageName" in value) {
                        result.push(
                            "---ecn",
                            key,
                            value.packageName + "/" + value.className,
                        );
                        break;
                    }

                    switch (value.type) {
                        case "uri":
                            result.push("--eu", key, value.value);
                            break;
                        case "arrayList":
                            if (value.value.length === 0) {
                                throw new Error(
                                    "Intent extra array cannot be empty",
                                );
                            }

                            switch (typeof value.value[0]) {
                                case "number":
                                    result.push(
                                        "--eial",
                                        key,
                                        (value.value as number[]).join(","),
                                    );
                                    break;
                                case "object":
                                    switch (value.value[0].type) {
                                        case "long":
                                            result.push(
                                                "--elal",
                                                key,
                                                (
                                                    value.value as IntentNumberExtra[]
                                                )
                                                    .map((item) => item.value)
                                                    .join(","),
                                            );
                                            break;
                                        case "float":
                                            result.push(
                                                "--efal",
                                                key,
                                                (
                                                    value.value as IntentNumberExtra[]
                                                )
                                                    .map((item) => item.value)
                                                    .join(","),
                                            );
                                            break;
                                        case "double":
                                            result.push(
                                                "--edal",
                                                key,
                                                (
                                                    value.value as IntentNumberExtra[]
                                                )
                                                    .map((item) => item.value)
                                                    .join(","),
                                            );
                                            break;
                                    }
                                    break;
                                case "string":
                                    result.push(
                                        "--esal",
                                        key,
                                        (value.value as string[])
                                            .map((item) =>
                                                item.replaceAll(",", "\\,"),
                                            )
                                            .join(","),
                                    );
                                    break;
                            }
                            break;
                        case "long":
                            result.push("--el", key, value.value.toString());
                            break;
                        case "float":
                            result.push("--ef", key, value.value.toString());
                            break;
                        case "double":
                            result.push("--ed", key, value.value.toString());
                            break;
                    }
                    break;
                case "number":
                    result.push("--ei", key, value.toString());
                    break;
                case "boolean":
                    result.push("--ez", key, value ? "true" : "false");
                    break;
            }
        }
    }

    if (intent.component) {
        result.push(
            "-n",
            intent.component.packageName + "/" + intent.component.className,
        );
    }

    if (intent.package) {
        result.push("-p", intent.package);
    }

    if (intent.flags) {
        result.push("-f", intent.flags.toString());
    }

    return result;
}
