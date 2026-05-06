import type { ReactNode } from "react";

type TeletextFrameProps = {
  children: ReactNode;
  className?: string;
};

export default function TeletextFrame({
  children,
  className = "",
}: TeletextFrameProps) {
  return (
    <section
      className={`teletext-frame teletext-square overflow-hidden ${className}`}
    >
      {children}
    </section>
  );
}
