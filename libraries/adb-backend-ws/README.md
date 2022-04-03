# `@yume-chan/adb-backend-ws`

Backend for `@yume-chan/adb` using WebSocket API.

Requires WebSockify softwares to bridge the connection between TCP (ADB over Wi-Fi) and WebSocket.

**WARNING:** WebSocket is an unreliable protocol! When send buffer is full, it will throw away any new-coming data, or even cut the connection.

Note: This package only demonstrate the possibility. It's not intended to be used in production, thus not published to NPM registry.
