"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchStream, StreamResult } from "@/lib/auth";
import HlsPlayer from "@/components/HlsPlayer";

export default function StreamPanel({ venueId }: { venueId: string }) {
  const [state, setState] = useState<StreamResult | "loading">("loading");

  useEffect(() => {
    let cancelled = false;

    fetchStream(venueId).then((result) => {
      if (!cancelled) setState(result);
    });

    return () => {
      cancelled = true;
    };
  }, [venueId]);

  function renderBody() {
    if (state === "loading") {
      return <p>Checking your access...</p>;
    }

    if (state.status === "login-required") {
      return (
        <>
          <p>
            Live streams are for members. Sign in or start your free trial to
            watch when this venue goes live.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="button button-outline button-small">
              Login
            </Link>
            <Link href="/createaccount" className="button button-small">
              Start free trial
            </Link>
          </div>
        </>
      );
    }

    if (state.status === "trial-expired") {
      return (
        <p>
          Your 31-day free trial has ended. Subscription options are coming
          soon.
        </p>
      );
    }

    if (state.status === "error") {
      return <p>{state.error}</p>;
    }

    const safeUrl =
      state.streamUrl && /^https?:\/\//i.test(state.streamUrl)
        ? state.streamUrl
        : null;

    if (!state.live || !safeUrl) {
      return <p>This venue isn&apos;t live right now. Check back soon.</p>;
    }

    const isHls = /\.m3u8(\?|$)/i.test(safeUrl);

    return (
      <>
        <p>● LIVE NOW. Enjoy the vibe.</p>
        {isHls ? (
          <HlsPlayer key={safeUrl} src={safeUrl} />
        ) : (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-small"
          >
            Watch live
          </a>
        )}
      </>
    );
  }

  return (
    <div className="stream-panel">
      <h2>Live stream</h2>
      {renderBody()}
    </div>
  );
}
