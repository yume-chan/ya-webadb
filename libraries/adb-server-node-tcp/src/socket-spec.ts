function findIndices(str: string, char: string): number[] {
    const indices = [];
    let index = -1;
    while ((index = str.indexOf(char, index + 1)) !== -1) {
        indices.push(index);
    }
    return indices;
}

/**
 * Parse the whole input string as a decimal number.
 *
 * Negatives are also supported.
 */
export function decimalToNumber(
    input: string,
    start = 0,
    end = input.length,
): number | undefined {
    if (start >= end) {
        return undefined;
    }

    const negative = input.charAt(start) === "-";
    if (negative) {
        start += 1;
        if (start === end) {
            return undefined;
        }
    }

    let value = 0;
    for (; start < end; start += 1) {
        const char = input.charCodeAt(start);
        if (char < 48 || char > 57) {
            return undefined;
        }
        value = value * 10 + char - 48;
    }

    return negative ? -value : value;
}

// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/socket_spec.cpp;l=104;drc=61197364367c9e404c7da6900658f1b16c42d0da
// https://cs.android.com/android/platform/superproject/main/+/main:system/libbase/parsenetaddress.cpp;l=27;drc=61197364367c9e404c7da6900658f1b16c42d0da
export function parseTcpSocketSpec(spec: string): {
    host?: string;
    port?: number;
} {
    let port = decimalToNumber(spec);
    if (port !== undefined) {
        // Port only
        if (port <= 0 || port > 65535) {
            throw new Error(`bad port number ${port}`);
        }
        return { port };
    }

    if (spec.startsWith("[")) {
        const end = spec.indexOf("]");
        if (end < 0) {
            throw new Error(`bad IPv6 address ${spec}`);
        }

        // [::1]:123
        const host = spec.substring(1, end);
        const port = decimalToNumber(spec, end + 2);
        if (port === undefined || port <= 0 || port > 65535) {
            throw new Error(`bad port number ${port} in ${spec}`);
        }
        return { host, port };
    }

    let host: string | undefined;
    port = undefined;

    const colons = findIndices(spec, ":");
    if (!spec.includes(".") && colons.length >= 2 && colons.length <= 7) {
        // ::1
        host = spec;
    } else if (colons.length === 0) {
        // 1.2.3.4 or some.accidental.domain.com
        host = spec;
    } else if (colons.length === 1) {
        // 1.2.3.4:123 or some.accidental.domain.com:123
        host = spec.substring(0, colons[0]);
        port = decimalToNumber(spec, colons[0]! + 1);
        if (port === undefined || port <= 0 || port > 65535) {
            throw new Error(`bad port number ${port} in ${spec}`);
        }
    }

    if (!host) {
        throw new Error(`no host in ${spec}`);
    }

    if (port !== undefined) {
        return { host, port };
    } else {
        return { host };
    }
}
