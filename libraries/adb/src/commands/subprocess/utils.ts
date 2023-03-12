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
        // a'b becomes a'\'b
        result += String.raw`'\''`;
        base = found + 1;
    }

    result += `'`;
    return result;
}
