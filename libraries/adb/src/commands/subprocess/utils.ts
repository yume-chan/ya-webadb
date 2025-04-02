export function escapeArg(s: string) {
    let result = "";
    result += `'`;

    let base = 0;
    while (true) {
        const found = s.indexOf(`'`, base);
        if (found === -1) {
            result += s.substring(base);
            break;
        }
        result += s.substring(base, found);
        // a'b becomes a'\'b (the backslash is not a escape character)
        result += String.raw`'\''`;
        base = found + 1;
    }

    result += `'`;
    return result;
}

export function splitCommand(command: string): string[] {
    const result: string[] = [];
    let quote: string | undefined;
    let isEscaped = false;
    let start = 0;

    for (let i = 0, len = command.length; i < len; i += 1) {
        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        const char = command.charAt(i);
        switch (char) {
            case " ":
                if (!quote && i !== start) {
                    result.push(command.substring(start, i));
                    start = i + 1;
                }
                break;
            case "'":
            case '"':
                if (!quote) {
                    quote = char;
                } else if (char === quote) {
                    quote = undefined;
                }
                break;
            case "\\":
                isEscaped = true;
                break;
        }
    }

    if (start < command.length) {
        result.push(command.substring(start));
    }

    return result;
}
