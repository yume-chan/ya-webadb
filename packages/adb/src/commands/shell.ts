
export function escapeArg(s: string) {
    let result = '';
    result += `'`;

    let base = 0;
    while (true) {
        const found = s.indexOf(`'`, base);
        if (found === -1) {
            result += s.substring(base);
            break;
        }
        result += s.substring(base, found);
        result += String.raw`'\''`; // a'b => a'\'b
        base = found + 1;
    }

    result += `'`;
    return result;
}
