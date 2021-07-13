---
sidebar_position: 2
---

# Packet Format

ADB protocol is a bi-directional, packet-oriented protocol. Each packet has a fixed-sized header and an optional, variable-sized payload.

Because it is originally implemented in C for Linux, all multi-byte fields are in little-endian, and all strings are in UTF-8 encoding.

Before Android 9, it used `char *` for string handling, so null terminators are required. Now it’s transitioning to `std::string`, which doesn't require null-terminators. But not all places has been changed, and for backward compatibility, adding null-terminators are still recommended.

Each packet contains following fields:

| Byte Offset | Type                | Field         | Description                            |
| ----------- | ------------------- | ------------- | -------------------------------------- |
| 0           | char[4]             | command       | Packet type                            |
| 4           | in32                | arg0          | Meaning defined by each packet type    |
| 8           | in32                | arg1          | Meaning defined by each packet type    |
| 12          | uint32              | payloadLength | Length of payload, in bytes            |
| 16          | uint32              | checksum      | Checksum for verify data integrity     |
| 20          | uint32              | magic         | Should equal to `command ^ 0xFFFFFFFF` |
| 24          | byte[payloadLength] | payload       | Meaning defined by each packet type    |

## Command

The `command` field consists of four ASCII characters.

For example, `"CNXN"` packets' `command` is `[0x43, 0x4e, 0x58, 0x4e]`, or `0x4e584e43` in Hex (Hex strings are big-endian).

## arg0/arg1

Two integer parameters for the `command`.

## Checksum

Checksum is calculated by adding up all bytes in `payload`.

For example, when the payload is `[0x01, 0x02, 0x03]`, the `checksum` is `0x01 + 0x02 + 0x03 = 0x00000006`.
