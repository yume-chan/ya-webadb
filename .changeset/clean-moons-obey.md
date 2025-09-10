---
"@yume-chan/scrcpy": major
---

Convert `ScrcpyOptionsX\_YY.prototype.controlMessageTypes` to a map between internal control message types to version-specific values.

Generally, you would use `ScrcpyControlMessageSerializer`, `ScrcpyControlMessageWriter`, or `AdbScrcpyClient.prototype.controller` to send control messages to device, instead of using `controlMessageTypes` directly.
