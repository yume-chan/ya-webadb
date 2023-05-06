# `@yume-chan/adb-cli`

This is a Node.js CLI application that mimics the functionality of the `adb` command line tool.

It requires a native Google ADB server to be running on the host machine.

## Usage

```sh
Usage: tango-cli [options] [command]

Options:
  -H <host>                  name of adb server host (default: "127.0.0.1")
  -P <port>                  port of adb server (default: 5037)
  -h, --help                 display help for command

Commands:
  devices [options]
  shell [options] [args...]  run remote shell command (interactive shell if no
                             command given). `--` is required before command name.
  help [command]             display help for command
```
