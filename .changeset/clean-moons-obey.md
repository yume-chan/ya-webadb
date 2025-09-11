---
"@yume-chan/scrcpy": major
---

Convert `ScrcpyOptionsX_YY.prototype.controlMessageTypes` to a mapping from internal control message types to version-specific values.

Generally, `ScrcpyControlMessageSerializer`, `ScrcpyControlMessageWriter`, or `AdbScrcpyClient.prototype.controller` should be used to send control messages to devices, instead of using `controlMessageTypes` directly.
