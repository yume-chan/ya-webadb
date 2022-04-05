// cspell: ignore scrollback

import { AbortController, AdbSubprocessProtocol, encodeUtf8, WritableStream } from "@yume-chan/adb";
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

    private _socket: AdbSubprocessProtocol | undefined;
    private _socketAbortController: AbortController | undefined;
    public get socket() { return this._socket; }
    public set socket(value) {
        if (this._socket) {
            // Remove event listeners
            this.dispose();
            this._socketAbortController?.abort();
        }

        this._socket = value;

        if (value) {
            this.terminal.clear();
            this.terminal.reset();

            this._socketAbortController = new AbortController();

            // pty mode only has one stream
            value.stdout.pipeTo(new WritableStream<Uint8Array>({
                write: (chunk) => {
                    this.terminal.write(chunk);
                },
            }), {
                signal: this._socketAbortController.signal,
            });

            const _writer = value.stdin.getWriter();
            this.addDisposable(this.terminal.onData(data => {
                const buffer = encodeUtf8(data);
                _writer.write(buffer);
            }));

            this.fit();
        }
    }

    public constructor() {
        super();

        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.overflow = 'hidden';

        this.terminal.options.fontFamily = '"Cascadia Code", Consolas, monospace, "Source Han Sans SC", "Microsoft YaHei"';
        this.terminal.options.letterSpacing = 1;
        this.terminal.options.cursorStyle = 'bar';
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
            this.terminal.options.cursorBlink = true;
            this.fit();
        }
    }

    public fit() {
        this.fitAddon.fit();
        // Resize remote terminal
        const { rows, cols } = this.terminal;
        this._socket?.resize(rows, cols);
    }
}
