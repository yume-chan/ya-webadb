---
"@yume-chan/adb-credential-web": major
---

Separate private key creation and storage.

- Two built-in storages for Web platform: IndexedDB, LocalStorage
- Two encrypted storages (takes an inner storage to actually store the encrypted data): Password-protected, WebAuthn PRF extension. Encrypted storages can be chained for multi-factor authentication.
- File-based storage for Node.js: compatible with Google ADB
