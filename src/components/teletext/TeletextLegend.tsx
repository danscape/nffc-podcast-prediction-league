import type { ReactNode } from "react";

type LegendItem = {
  mark: ReactNode;
  label: string;
};

type TeletextLegendProps = {
  title?: string;
  items: LegendItem[];
  className?: string;
};

export default function TeletextLegend({
  title = "Key",
  items,
  className = "",
}: TeletextLegendProps) {
  return (
    <section className={`teletext-panel teletext-square p-3 ${className}`}>
      <div className="teletext-heading text-sm font-black uppercase text-white">
        {title}
      </div>

      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="flex min-w-12 items-center">{item.mark}</div>
            <div className="text-xs font-black uppercase tracking-wide text-white/80">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
