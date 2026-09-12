import React from "react";

interface SectionHeaderProps {
  index?: string; // e.g. "01"
  total?: string; // e.g. "04"
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Skynetics-style page/section header: oversized display title, numbered
 * chrome ("01 / 04"), mono subtitle line, and optional trailing action slot.
 */
export function SectionHeader({ index, total, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="border-b border-hairline pb-5">
      {index && (
        <div className="section-index mb-3">
          {index} / {total ?? "01"}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="display-hero text-3xl md:text-4xl text-primary">{title}</h1>
          {subtitle && (
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted mt-2">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
    </div>
  );
}
