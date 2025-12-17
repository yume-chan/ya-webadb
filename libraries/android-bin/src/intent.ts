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
    type: "array" | "arrayList";
    itemType: "int" | IntentNumberExtra["type"];
    value: number[];
}

export interface IntentStringArrayExtra {
    type: "array" | "arrayList";
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
              | bigint
              | IntentStringExtra
              | ComponentName
              | IntentNumberArrayExtra
              | IntentStringArrayExtra
              | IntentNumberExtra
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

function serializeExtraArray(
    array: IntentNumberArrayExtra | IntentStringArrayExtra,
): [type: string, value: string] {
    let type: string;
    let value: string;

    if (array.itemType === "string") {
        type = "--es";
        value = array.value
            .map((item) => item.replaceAll(",", "\\,"))
            .join(",");
    } else {
        type = getNumberType(array.itemType);
        value = array.value.join(",");
    }

    if (array.type === "array") {
        type += "a";
    } else {
        type += "al";
    }

    return [type, value];
}

function serializeString(
    result: string[],
    key: string,
    value: string | undefined,
) {
    // Treat empty string as not set
    if (value) {
        result.push(key, value);
    }
}

export function serializeIntent(intent: Intent) {
    const result: string[] = [];

    serializeString(result, "-a", intent.action);
    serializeString(result, "-d", intent.data);
    serializeString(result, "-t", intent.type);
    serializeString(result, "-i", intent.identifier);

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

                    // `ComponentName`
                    if ("packageName" in value) {
                        result.push(
                            "--ecn",
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
                        case "arrayList":
                            {
                                const [type, valueString] =
                                    serializeExtraArray(value);
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
                    if (value % 1 !== 0) {
                        throw new Error(
                            `Extra \`${key}\` is not an integer, must use \`IntentNumberExtra\` type instead`,
                        );
                    }
                    // Infer type from value
                    if (value < -2147483648 || value > 2147483647) {
                        result.push("--el", key, value.toString());
                    } else {
                        result.push("--ei", key, value.toString());
                    }
                    break;
                case "bigint":
                    result.push("--el", key, value.toString());
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

    serializeString(result, "-p", intent.package);

    // `0` is the default value for `flags` when deserializing
    // so it can be omitted if it's either `undefined` or `0`
    if (intent.flags) {
        result.push("-f", intent.flags.toString());
    }

    return result;
}
