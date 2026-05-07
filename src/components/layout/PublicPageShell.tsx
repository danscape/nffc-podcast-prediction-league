import type { ReactNode } from "react";

type PublicPageShellProps = {
  children: ReactNode;
  compact?: boolean;
  topPadding?: "default" | "reduced";
  mobileFullBleed?: boolean;
};

export default function PublicPageShell({
  children,
  compact = false,
  topPadding = "default",
  mobileFullBleed = false,
}: PublicPageShellProps) {
  const paddingClass = mobileFullBleed
    ? "px-0 pb-0 pt-0 md:px-8 md:pb-8 md:pt-5 lg:px-14 lg:pt-5"
    : compact
      ? "px-4 py-4 lg:px-8 lg:py-6"
      : topPadding === "reduced"
        ? "px-8 pb-8 pt-5 lg:px-14 lg:pt-5"
        : "px-8 py-8 lg:px-14";

  const innerClass = mobileFullBleed
    ? "w-full max-w-none md:mx-auto md:max-w-[1840px]"
    : "mx-auto w-full max-w-[1840px]";

  return (
    <main
      className={`min-h-screen bg-[var(--nffc-black,#000000)] font-mono text-[var(--nffc-white,#f5f5f5)] ${paddingClass}`}
    >
      <section className={innerClass}>{children}</section>
    </main>
  );
}
