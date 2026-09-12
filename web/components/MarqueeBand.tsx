import React from "react";

interface MarqueeBandProps {
  items: string[];
  accent?: boolean;
  className?: string;
}

/**
 * Skynetics-style scrolling marquee band: items separated by diamond glyphs.
 * Content is duplicated once so a translateX(-50%) loop is seamless.
 */
export function MarqueeBand({ items, accent = false, className = "" }: MarqueeBandProps) {
  const row = (ariaHidden: boolean) => (
    <div aria-hidden={ariaHidden} className="flex shrink-0 items-center">
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center whitespace-nowrap">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em]">{item}</span>
          <span className="mx-4 text-[8px] opacity-60">◆</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`w-full overflow-hidden border-y py-2 select-none ${
        accent ? "border-info/25 bg-info/5 text-info" : "border-hairline bg-panel/60 text-muted"
      } ${className}`}
    >
      <div className="marquee-track flex animate-marquee-slow">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
