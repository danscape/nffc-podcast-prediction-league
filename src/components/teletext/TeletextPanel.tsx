import type { ReactNode } from "react";

type TeletextPanelProps = {
  children: ReactNode;
  className?: string;
};

export default function TeletextPanel({
  children,
  className = "",
}: TeletextPanelProps) {
  return (
    <section className={`teletext-panel teletext-square ${className}`}>
      {children}
    </section>
  );
}
