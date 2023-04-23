# @yume-chan/pcm-player

Play raw audio sample stream using Web Audio API.

Only support stereo audio.

TODO:

-   [ ] resample audio to compensate for audio buffer underrun

## Usage

Depends on the sample format, there are multiple player classes:

-   `Int16PcmPlayer` (little endian)
-   `Float32PcmPlayer`
-   `Float32PlanerPcmPlayer`

No `Planer`: audio samples are interleaved (left channel first).

With `Planer`: audio samples are in a two-dimensional array (left channel first).

The constructors require user activation (must be invoked in a user event handler, e.g. `onclick`), because they create `AudioContext`s.

```ts
var player = Int16PcmPlayer(44100);
player.start();
player.feed(new Int16Array([0, 0, 0, 0, 0, 0, 0, 0]));
player.stop(); // `AudioContext` will be closed, so can't be restarted
```
