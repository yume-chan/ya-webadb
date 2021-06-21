---
sidebar_position: 3
---

# Connection

ADB client connects to daemons by exchanging `CNXN` [packets](./packet.md).

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

Device banners describe device information and capabilities. It has the following format:

*DeviceBanner* **:**<br/>
  *DeviceIdentifier* **::** *ParameterList* **\0**

*DeviceIdentifer* **:**<br/>
  **host**<br/>
  **device**<br/>
  **bootloader**

*ParameterList* **:**<br/>
  *Parameter*<br/>
  *ParameterList* *Parameter*

*Parameter* **:**<br/>
  *ParameterName* **=** *ParameterValue* **;**

*ParameterName* **:**<br/>
  any character except **=** **,** **;**

*ParameterValue* **:**<br/>
  *ParameterStringValue*<br/>
  *ParameterListValue*

*ParameterStringValue* **:**<br/>
  any character except **=** **,** **;**

*ParameterListValue* **:**<br/>
  *ParameterStringValue*<br/>
  *ParameterListValue* **,** *ParameterStringValue*

A device banner sent by client may look like this:

```text
host::features=shell_v2,cmd,stat_v2,ls_v2,fixed_push_mkdir,apex,abb,fixed_push_symlink_timestamp,abb_exec,remount_shell,track_app,sendrecv_v2,sendrecv_v2_brotli,sendrecv_v2_lz4,sendrecv_v2_zstd,sendrecv_v2_dry_run_send;\0
```

:::tip NULL Termination
The trailing `;` and `\0` are required in Android <9.
:::

A device banner sent by daemon may look like this:

```text
device::ro.product.name=venus;ro.product.model=M2011K2C;ro.product.device=venus;features=sendrecv_v2_brotli,remount_shell,sendrecv_v2,abb_exec,fixed_push_mkdir,fixed_push_symlink_timestamp,abb,shell_v2,cmd,ls_v2,apex,stat_v2
```

## Sequence Diagram

```uml
@startuml

participant Client
participant Daemon

Client -> Daemon: CNXN (host::)
...Optional Authentication...
Daemon -> Client: CNXN (device::)

@enduml
```
