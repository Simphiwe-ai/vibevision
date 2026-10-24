"use client";

import { useEffect, useRef, useState } from "react";

// Plays an HLS (.m3u8) live stream. hls.js is loaded only in the browser,
// because Next pre-renders client components on the server first.
// The parent should pass key={src} so the failed state resets for new links.
export default function HlsPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    let nativeError: (() => void) | null = null;

    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled) return;

        if (Hls.isSupported()) {
          const player = new Hls();
          hls = player;
          player.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              player.destroy();
              hls = null;
              setFailed(true);
            }
          });
          player.loadSource(src);
          player.attachMedia(video);
          video.play().catch(() => {});
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari and older iPhones play HLS without a library.
          nativeError = () => setFailed(true);
          video.addEventListener("error", nativeError);
          video.src = src;
          video.play().catch(() => {});
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      hls?.destroy();
      if (nativeError) video.removeEventListener("error", nativeError);
      video.removeAttribute("src");
      video.load();
    };
  }, [src, attempt]);

  function retry() {
    setFailed(false);
    setAttempt((count) => count + 1);
  }

  return (
    <div>
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        style={{
          width: "100%",
          maxWidth: 960,
          background: "#000",
          borderRadius: 8,
        }}
      />
      {failed && (
        <p>
          The stream stopped or can&apos;t be played right now.{" "}
          <button
            type="button"
            onClick={retry}
            className="button button-outline button-small"
          >
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
