import { Terminal } from 'xterm';
import { WebAdb } from './webadb.js';
import 'xterm/css/xterm.css';

document.getElementById('start')!.onclick = async () => {
    const adb = await WebAdb.open();
    await adb.connect();

    const textEncoder = new TextEncoder();

    const shell = await adb.shell();

    const terminal = new Terminal({
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
