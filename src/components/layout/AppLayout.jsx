import React from 'react';

export default function AppLayout({
  appBar,
  caseHeader,
  banner,
  nav,
  overlays,
  children
}) {
  return (
    <div
      data-testid="app-layout"
      className="h-dvh flex flex-col overflow-hidden bg-white text-slate-900"
    >
      <div className="camera-dead-zone" aria-hidden="true" data-testid="camera-dead-zone" />
      <div className="touch-below-camera">
        {appBar}
        {caseHeader}
        {banner}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</main>
        {nav}
      </div>
      {overlays}
    </div>
  );
}
