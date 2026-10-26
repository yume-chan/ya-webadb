---
"@yume-chan/adb-scrcpy": patch
---

Run the default scrcpy server process as Android's shell user when adbd is rooted, preventing clipboard access from failing because UID 0 does not own com.android.shell. Custom spawners retain control over the launch command.
