---
"@yume-chan/adb": minor
---

For daemon transport, not reading from one socket now only puts backpressure on the offending socket, i.e. it no longer block new data for all other sockets
