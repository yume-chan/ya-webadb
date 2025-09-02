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

function serializeArray(
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
                                    serializeArray(value);
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

    // `0` is the default value for `flags` when deserializing
    // so it can be omitted if it's either `undefined` or `0`
    if (intent.flags) {
        result.push("-f", intent.flags.toString());
    }

    return result;
}
