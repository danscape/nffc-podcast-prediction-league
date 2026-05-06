import type { ReactNode } from "react";

type PublicPageShellProps = {
  children: ReactNode;
  compact?: boolean;
  topPadding?: "default" | "reduced";
};

export default function PublicPageShell({
  children,
  compact = false,
  topPadding = "default",
}: PublicPageShellProps) {
  return (
    <main
      className={`min-h-screen bg-[var(--nffc-black,#000000)] font-mono text-[var(--nffc-white,#f5f5f5)] ${
        compact
          ? "px-4 py-4 lg:px-8 lg:py-6"
          : topPadding === "reduced"
            ? "px-8 pb-8 pt-5 lg:px-14 lg:pt-5"
            : "px-8 py-8 lg:px-14"
      }`}
    >
      <section className="mx-auto w-full max-w-[1840px]">
        {children}
      </section>
    </main>
  );
}
