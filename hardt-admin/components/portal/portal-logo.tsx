import { ShieldCheck } from "lucide-react";
import Link from "next/link";

type PortalLogoProps = {
  compact?: boolean;
};

export function PortalLogo({
  compact = false,
}: PortalLogoProps) {
  return (
    <Link
      href="/portal/dashboard"
      className="flex items-center gap-3"
    >
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-[0_16px_45px_rgba(124,58,237,0.35)] backdrop-blur">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-violet-400/20" />

        <ShieldCheck
          className="relative text-white"
          size={27}
          strokeWidth={2.1}
        />
      </div>

      {!compact && (
        <div className="leading-none">
          <p className="text-[22px] font-black tracking-[0.18em] text-white">
            HARDT
          </p>

          <p className="mt-1 text-[11px] font-semibold tracking-[0.42em] text-violet-200">
            SYSTEMS
          </p>

          <p className="mt-2 text-xs font-medium text-white/45">
            Hardt OS
          </p>
        </div>
      )}
    </Link>
  );
}