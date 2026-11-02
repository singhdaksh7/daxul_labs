import type { CartLithophane } from "@/lib/lithophane";

/** Compact custom-lithophane summary shown in the cart drawer and at checkout. */
export default function LithophaneCartSummary({ data, compact = false }: { data: CartLithophane; compact?: boolean }) {
  const opts = data.optionSummary.filter((o) => o.valueLabel && o.valueLabel !== "No");
  return (
    <div data-testid="lithophane-cart-summary" className="mt-1 space-y-0.5 text-[11px] text-[#71717A]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-daxul-black px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-daxul-lime">
          Custom lithophane
        </span>
        <span className="rounded border border-daxul-black/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-daxul-black">
          Custom / prepaid only
        </span>
      </div>
      <div>
        <span className="font-semibold text-daxul-black">{data.varietyName}</span> · {data.sizeName} · {data.widthMm} x {data.heightMm} mm
      </div>
      {!compact && (
        <>
          <div>
            {data.orientation === "landscape" ? "Landscape" : "Portrait"} · Light {data.lighting === "on" ? "on" : "off"} preview
          </div>
          {opts.length > 0 && <div>{opts.map((o) => `${o.label}: ${o.valueLabel}`).join(" · ")}</div>}
          {data.notes ? <div className="truncate">Note: {data.notes}</div> : null}
        </>
      )}
    </div>
  );
}
