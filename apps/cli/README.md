# `@yume-chan/adb-cli`

This is a Node.js CLI application that mimics the functionality of the `adb` command line tool.

It requires a native Google ADB server to be running on the host machine.

## Usage

```txt
Usage: tango-cli [options] [command]

Options:
  -H <host>                                                   name of adb server host (default: "127.0.0.1")
  -P <port>                                                   port of adb server (default: 5037)
  -h, --help                                                  display help for command

Commands:
  devices [-l]                                                list connected devices (-l for long output)
  shell [options] [-- <args...>]                              run remote shell command (interactive shell if no command
                                                              given). `--` is required before command name.
  logcat [-- <args...>                                        show device log (logcat --help for more)
  reboot [bootloader|recovery|sideload|sideload-auto-reboot]  reboot the device; defaults to booting system image but
                                                              supports bootloader and recovery too. sideload reboots
                                                              into recovery and automatically starts sideload mode,
                                                              sideload-auto-reboot is the same but reboots after
                                                              sideloading.
  usb                                                         restart adbd listening on USB
  tcpip port                                                  restart adbd listening on TCP on PORT
  kill-server                                                 kill the server if it is running
  help [command]                                              display help for command
```
