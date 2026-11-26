"use client";

import { SignalLost } from "@/components/signal-lost";

export default function SalonError(props: {
  error: unknown;
  retry: () => void;
}) {
  return <SignalLost {...props} />;
}
