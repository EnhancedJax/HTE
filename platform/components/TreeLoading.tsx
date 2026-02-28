"use client";

import {
  BookIcon,
  BrowsersIcon,
  GlobeIcon,
  NetworkIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { AnimatedList } from "./ui/animated-list";
import { ProgressiveBlur } from "./ui/progressive-blur";

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

const ROTATION_MS = 2000;

export function TreeLoading() {
  const [messageIndex, setMessageIndex] = useState(
    Math.floor(Math.random() * LOADING_MESSAGES.length),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 relative">
      <ProgressiveBlur height="60%" position="bottom" />
      <AnimatedList
        stackGap={20}
        columnGap={85}
        scaleFactor={0.05}
        scrollDownDuration={5}
        formationDuration={1}
        className="opacity-50"
      >
        {[0, 1, 0, 3, 2, 3, 1, 3, 0, 1].map((i, index) => (
          <div
            key={index}
            className="bg-card flex w-full max-w-[350px] items-center gap-4 rounded-2xl border p-4 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-white">
              {
                [
                  <GlobeIcon className="size-4" weight="bold" aria-hidden />,
                  <BookIcon className="size-4" weight="bold" aria-hidden />,
                  <BrowsersIcon className="size-4" weight="bold" aria-hidden />,
                  <NetworkIcon className="size-4" weight="bold" aria-hidden />,
                ][i]
              }
            </div>
            <div className="flex flex-1 flex-col">
              <div
                style={{ width: `${(i + 1) * 10}%` }}
                className="h-2 bg-foreground mb-1.5"
              />
              <div
                style={{ width: `${100 - (i + 1) * 10}%` }}
                className="h-2 bg-muted-foreground mb-1"
              />
            </div>
          </div>
        ))}
      </AnimatedList>
      <p
        className="text-center text-2xl shadow-2xl transition-opacity duration-300 fixed z-50"
        key={messageIndex}
      >
        {LOADING_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
