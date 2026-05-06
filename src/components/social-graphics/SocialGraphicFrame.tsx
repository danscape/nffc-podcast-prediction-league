import type { ReactNode } from "react";

type SocialGraphicFrameProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function SocialGraphicFrame({
  eyebrow = "🔮 NFFC Podcast Prediction League",
  title,
  children,
  footer,
  className = "",
}: SocialGraphicFrameProps) {
  return (
    <article
      className={`mx-auto w-full overflow-hidden rounded-none border border-[#111111] bg-[#111111] text-white shadow-none ${className}`}
    >
      <div className="relative flex min-h-[640px] flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,_#C8102E_0,_#7A0719_34%,_#111111_74%)] p-5">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="h-full w-full bg-[linear-gradient(135deg,_transparent_0,_transparent_47%,_#ffffff_47%,_#ffffff_53%,_transparent_53%,_transparent_100%)]" />
        </div>

        <div className="relative z-10">
          <div className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-white/65">
            {eyebrow}
          </div>

          <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
            {title}
          </h2>
        </div>

        <div className="relative z-10 grid gap-3 py-3">{children}</div>

        {footer && (
          <div className="relative z-10 text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/45">
            {footer}
          </div>
        )}
      </div>
    </article>
  );
}
