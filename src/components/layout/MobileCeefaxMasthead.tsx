import Image from "next/image";
import Link from "next/link";

type MobileCeefaxMastheadProps = {
  active?: "home" | "results" | "none";
};

export default function MobileCeefaxMasthead({
  active = "none",
}: MobileCeefaxMastheadProps) {
  return (
    <header className="w-full pb-2 md:hidden">
      <div className="flex w-full justify-center overflow-hidden pt-0">
        <Image
          src="/brand/nffc-podcast-prediction-league-banner.png"
          alt="NFFC Podcast Prediction League"
          width={420}
          height={180}
          priority
          className="h-10 max-w-[88%] object-contain"
        />
      </div>

      <nav className="mt-1 grid w-full grid-cols-2 gap-1 bg-[var(--nffc-black,#000000)]">
        <Link
          href="/"
          className={`border px-2 py-1.5 text-center text-[0.78rem] font-black uppercase tracking-[0.12em] transition ${
            active === "home"
              ? "border-[var(--stat-green,#22e55e)] text-[var(--stat-green,#22e55e)]"
              : "border-[var(--nffc-red,#e50914)] text-white"
          }`}
        >
          Home
        </Link>

        <Link
          href="/weekly-results"
          className={`border px-2 py-1.5 text-center text-[0.78rem] font-black uppercase tracking-[0.12em] transition ${
            active === "results"
              ? "border-[var(--stat-green,#22e55e)] text-[var(--stat-green,#22e55e)]"
              : "border-[var(--nffc-red,#e50914)] text-white"
          }`}
        >
          GW Results
        </Link>
      </nav>
    </header>
  );
}
