/**
 * PortalFAB.jsx — Floating Action Button rendered via React Portal
 * Renders into document.body so `position: fixed` is always relative to viewport,
 * regardless of any parent overflow, transform, or contain properties.
 */
import { createPortal } from 'react-dom';

export default function PortalFAB({ children }) {
  return createPortal(
    <div className="fixed bottom-[76px] right-4 z-[9998] flex flex-col items-end gap-2">
      {children}
    </div>,
    document.body
  );
}
