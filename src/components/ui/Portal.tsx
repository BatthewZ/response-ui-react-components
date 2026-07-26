"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
  container?: Element | null;
}

/**
 * Renders nothing until after mount.
 *
 * `typeof document === "undefined"` stops the server throw but is the wrong
 * signal on the client, where the *first* render is the hydration render and
 * `document` is already there. The server sent no portal, the client renders
 * one, and React discards and rebuilds the tree. Gating on mount makes the
 * hydration render match what the server sent — nothing — and the portal
 * appears in the commit after, which the server never has to agree with.
 */
export const Portal: React.FC<PortalProps> = ({ children, container }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
};
