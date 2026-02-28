"use client";

import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Growing the tree…",
  "Planting ideas…",
  "Branching out…",
  "Watering the roots…",
  "Counting leaves…",
  "Shaking the branches…",
  "Following the roots…",
  "One sec, pruning…",
  "Almost there, just raking…",
  "Building the canopy…",
];

const ROTATION_MS = 1000;

export function TreeLoading() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <p
        className="min-h-[1.5em] text-center text-sm text-muted-foreground transition-opacity duration-300"
        key={messageIndex}
      >
        {LOADING_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
