import { Terminal } from 'xterm';
import { SearchAddon } from 'xterm-addon-search';
import { WebAdb } from './webadb.js';
import 'xterm/css/xterm.css';

document.getElementById('start')!.onclick = async () => {
    const adb = await WebAdb.open();
    await adb.connect();

    const textEncoder = new TextEncoder();

    const output = await adb.shell('echo', '1');
    console.log(output);

    const shell = await adb.shell();

    const terminal = new Terminal({
        scrollback: 9001,
    });

    const searchAddon = new SearchAddon();
    terminal.loadAddon(searchAddon);

    const keyword = document.getElementById('search-keyword')! as HTMLInputElement;
    keyword.addEventListener('input', () => {
        searchAddon.findNext(keyword.value, { incremental: true });
    });

    const next = document.getElementById('search-next')!;
    next.addEventListener('click', () => {
        searchAddon.findNext(keyword.value);
    });

    const prev = document.getElementById('search-prev')!;
    prev.addEventListener('click', () => {
        searchAddon.findPrevious(keyword.value);
    });

    terminal.open(document.getElementById('terminal')!);
    terminal.onData(data => {
        const { buffer } = textEncoder.encode(data);
        shell.write(buffer);
    });
    shell.onData(data => {
        terminal.write(new Uint8Array(data));
    });
};
