import type { ReactNode } from "react";

type MobileCeefaxSectionProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export default function MobileCeefaxSection({
  title,
  children,
  className = "",
}: MobileCeefaxSectionProps) {
  return (
    <section className={`min-w-0 px-0 ${className}`}>
      {title ? (
        <h2 className="box-border w-full bg-[var(--nffc-red,#e50914)] px-1.5 py-0.5 text-base font-black uppercase tracking-[0.08em] text-white">
          {title}
        </h2>
      ) : null}

      {children}
    </section>
  );
}
