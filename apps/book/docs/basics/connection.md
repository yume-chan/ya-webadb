---
sidebar_position: 3
---

# Connection

ADB client connects to daemons by exchanging the `CNXN` [packet](./packet.md).

## `CNXN` Packet

| Field     | Value                                     | Description                      |
| --------- | ----------------------------------------- | -------------------------------- |
| `command` | `0x4e584e43`                              | `CNXN` in UTF-8 encoding         |
| `arg0`    | See [Protocol Version](#protocol-version) | Highest version number supported |
| `arg1`    | See [Protocol Version](#protocol-version) | Maximum payload size supported   |
| `payload` | See [Device Banner](#device-banner)       | Device banner                    |

## Protocol Version

ADB now has two versions, here are the differences:

| Version number   | 0x01000000     | 0x01000001         |
| ---------------- | -------------- | ------------------ |
| Android version  | <9             | >=9                |
| Max payload size | 4 * 1024 bytes | 1024 * 1024 bytes  |
| Omit `checksum`  | :x:            | :heavy_check_mark: |

In the first upstream `CNXN` packet:

* `arg0` field SHOULD contains the highest supported version number.
* `arg1` MUST NOT exceed the max payload size for that version in above table.

Starting from version `0x01000001`, Native ADB (client, server and daemon) doesn't validate the `checksum` field in any packets, including the handshake process.

However, ADB clients SHOULD always include correct `checksum` fields in handshake process, otherwise connections to older versions of daemons will fail.

## Device Banner

:::tip TODO
TODO
:::
