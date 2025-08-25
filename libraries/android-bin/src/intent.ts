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

export interface IntentNumberArrayExtra {
    type: "array";
    itemType: "int" | IntentNumberExtra["type"];
    value: number[];
}

export interface IntentArrayListExtra {
    type: "arrayList";
    value: number[] | IntentNumberExtra[] | string[];
}

export interface IntentNumberArrayListExtra extends IntentArrayListExtra {
    itemType: "int" | IntentNumberExtra["type"];
    value: number[];
}

export interface IntentStringArrayExtra {
    type: "array";
    itemType: "string";
    value: string[];
}

export interface IntentStringArrayListExtra extends IntentArrayListExtra {
    itemType: "string";
    value: string[];
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
              | IntentNumberArrayExtra
              | IntentArrayListExtra
              | IntentNumberExtra
              | IntentNumberExtra[]
              | IntentNumberArrayListExtra
              | string[]
              | IntentStringArrayExtra
              | IntentStringArrayListExtra
              | boolean
          >
        | undefined;
    flags?: number | undefined;
    package?: string | undefined;
    component?: ComponentName | undefined;
}

function getNumberType(type: "int" | IntentNumberExtra["type"]) {
    switch (type) {
        case "int":
            return "--ei";
        case "long":
            return "--el";
        case "float":
            return "--ef";
        case "double":
            return "--ed";
        default:
            throw new Error(`Unknown number type: ${type as string}`);
    }
}

function serializeRawArray(
    value: number[] | IntentNumberExtra[] | string[],
): [type: string, value: string] {
    if (value.length === 0) {
        throw new Error("Can't determine array item type from empty array.");
    }

    const item = value[0];
    switch (typeof item) {
        case "number":
            return ["--eia", (value as number[]).join(",")];
        case "object":
            return [
                getNumberType(item.type) + "a",
                (value as IntentNumberExtra[])
                    .map((item) => item.value)
                    .join(","),
            ];
        case "string":
            return [
                "--esa",
                (value as string[])
                    .map((item) => item.replaceAll(",", "\\,"))
                    .join(","),
            ];
        default:
            throw new Error(`Unknown array item type: ${typeof item}`);
    }
}

function serializeArrayExtra(
    value:
        | Omit<IntentNumberArrayExtra, "type">
        | Omit<IntentStringArrayExtra, "type">,
): [type: string, value: string] {
    if (value.itemType === "string") {
        return [
            "--esa",
            value.value.map((item) => item.replaceAll(",", "\\,")).join(","),
        ];
    }

    return [getNumberType(value.itemType) + "a", value.value.join(",")];
}

function serializeArrayListExtra(
    value:
        | IntentArrayListExtra
        | IntentNumberArrayListExtra
        | IntentStringArrayListExtra,
): [type: string, value: string] {
    if ("itemType" in value) {
        const [type, valueString] = serializeArrayExtra(value);
        return [type + "l", valueString];
    }

    const [type, valueString] = serializeRawArray(value.value);
    return [type + "l", valueString];
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
                        const [type, valueString] = serializeRawArray(value);
                        result.push(type, key, valueString);
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
                        case "array":
                            {
                                const [type, valueString] =
                                    serializeArrayExtra(value);
                                result.push(type, key, valueString);
                            }
                            break;
                        case "arrayList":
                            {
                                const [type, valueString] =
                                    serializeArrayListExtra(value);
                                result.push(type, key, valueString);
                            }
                            break;
                        default:
                            result.push(
                                getNumberType(value.type),
                                key,
                                value.value.toString(),
                            );
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
