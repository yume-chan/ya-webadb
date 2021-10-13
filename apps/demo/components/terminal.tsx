
import { AdbShell } from "@yume-chan/adb";
import { encodeUtf8 } from "@yume-chan/adb-backend-webusb";
import { AutoDisposable } from "@yume-chan/event";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebglAddon } from 'xterm-addon-webgl';

export class AdbTerminal extends AutoDisposable {
    private element = document.createElement('div');

    public terminal: Terminal = new Terminal({
        scrollback: 9000,
    });

    public searchAddon = new SearchAddon();

    private readonly fitAddon = new FitAddon();

    private _shell: AdbShell | undefined;
    public get socket() { return this._shell; }
    public set socket(value) {
        if (this._shell) {
            // Remove event listeners
            this.dispose();
        }

        this._shell = value;

        if (value) {
            this.terminal.clear();
            this.terminal.reset();

            this.addDisposable(value.onStdout(data => {
                this.terminal.write(new Uint8Array(data));
            }));
            this.addDisposable(value.onStderr(data => {
                this.terminal.write(new Uint8Array(data));
            }));
            this.addDisposable(this.terminal.onData(data => {
                const buffer = encodeUtf8(data);
                value.write(buffer);
            }));

            this.fit();
        }
    }

    public constructor() {
        super();

        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.overflow = 'hidden';

        this.terminal.setOption('fontFamily', '"Cascadia Code", Consolas, monospace, "Source Han Sans SC", "Microsoft YaHei"');
        this.terminal.setOption('letterSpacing', 1);
        this.terminal.setOption('cursorStyle', 'bar');
        this.terminal.loadAddon(this.searchAddon);
        this.terminal.loadAddon(this.fitAddon);
    }

    public setContainer(container: HTMLDivElement) {
        container.appendChild(this.element);
        if (!this.terminal.element) {
            void this.element.offsetWidth;
            this.terminal.open(this.element);
            this.terminal.loadAddon(new WebglAddon());
            // WebGL renderer ignores `cursorBlink` set before it initialized
            this.terminal.setOption('cursorBlink', true);
            this.fit();
        }
    }

    public fit() {
        this.fitAddon.fit();
        // workaround https://github.com/xtermjs/xterm.js/issues/3504
        (this.terminal as any)._core.viewport._refresh();
        // Resize remote terminal
        const { rows, cols } = this.terminal;
        this._shell?.resize(rows, cols);
    }
}
