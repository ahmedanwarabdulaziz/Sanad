"use client";

import {
    ALLOCATION_NOTE,
    BUILDING_INFO,
    DISCLAIMERS,
    FLOOR_NAMES,
    SALES_PHONES,
    areaBreakdown,
    facadeList,
    fmt,
    fmtDims,
    unitHighlights,
    type Unit,
} from "@/lib/sanad-zayed/masterplan/data";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rasterises the on-screen plan SVG (fonts fall back to Tahoma inside the image). */
async function svgToPng(svg: SVGSVGElement, width = 1700): Promise<string> {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    const height = Math.round((width * vb.height) / vb.width);
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.querySelectorAll("*").forEach((n) => {
        const el = n as SVGElement;
        if (el.style) {
            el.style.opacity = "";
            el.style.transform = "";
            if (el.tagName === "text") el.style.fontFamily = "Tahoma, Arial, sans-serif";
        }
    });
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = url;
        });
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const g = c.getContext("2d")!;
        g.fillStyle = "#FFFFFF";
        g.fillRect(0, 0, width, height);
        g.drawImage(img, 0, 0, width, height);
        return c.toDataURL("image/png");
    } finally {
        URL.revokeObjectURL(url);
    }
}

export async function downloadBrochure(unit: Unit, planSvg: SVGSVGElement) {
    const [{ jsPDF }, html2canvas] = await Promise.all([import("jspdf"), import("html2canvas").then((m) => m.default)]);
    const planPng = await svgToPng(planSvg);
    const a = areaBreakdown(unit);
    const rooms = unit.plan.rooms.filter((r) => r.type !== "x" && r.type !== "hall" && r.dims);
    const hl = unitHighlights(unit);
    const fac = facadeList(unit);
    const link = `${window.location.origin}${window.location.pathname}?unit=${unit.id}`;

    const page = document.createElement("div");
    page.dir = "rtl";
    page.style.cssText =
        "position:fixed;left:-10000px;top:0;width:794px;min-height:1123px;background:#fff;color:#1b2b40;font-family:var(--font-tajawal),Tahoma,sans-serif;box-sizing:border-box;";
    page.innerHTML = `
      <div style="background:linear-gradient(135deg,#0F1E33,#17427A);color:#fff;padding:22px 32px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:13px;color:#E5C77F;letter-spacing:.5px;">مشروع سند زايد · الشيخ زايد</div>
          <div style="font-size:34px;font-weight:800;direction:ltr;text-align:right;">${esc(unit.code)}</div>
          <div style="font-size:14px;opacity:.85;">${esc(BUILDING_INFO[unit.building].name)} · ${esc(FLOOR_NAMES[unit.floor])}</div>
        </div>
        <div style="text-align:center;">
          <img src="/images/long logo.png" style="height:46px;border-radius:6px;" />
          <div style="margin-top:10px;font-size:34px;font-weight:800;color:#E5C77F;">${fmt(a.total)} <span style="font-size:15px;color:#fff;">م²</span></div>
          <div style="font-size:11px;opacity:.75;">شاملة نسبة التحميل</div>
        </div>
      </div>
      <div style="padding:18px 32px 0;">
        <div style="border:1px solid #E7DCC3;border-radius:14px;background:#FBF8F2;padding:10px;text-align:center;">
          <img src="${planPng}" style="max-width:100%;max-height:520px;" />
        </div>
      </div>
      <div style="display:flex;gap:18px;padding:16px 32px 0;">
        <div style="flex:1.1;">
          <div style="font-weight:800;color:#17427A;margin-bottom:6px;font-size:15px;">مكونات الوحدة <span style="font-weight:400;color:#6b7280;font-size:11px;">(الأبعاد بالمتر)</span></div>
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
            ${rooms
                .map(
                    (r, i) =>
                        `<tr style="background:${i % 2 ? "#fff" : "#F6F3EC"}"><td style="padding:5px 8px;">${esc(r.name)}</td><td style="padding:5px 8px;text-align:left;font-weight:700;color:#7A5B17;">${esc(fmtDims(r.dims!))}</td></tr>`
                )
                .join("")}
          </table>
        </div>
        <div style="flex:1;">
          <div style="font-weight:800;color:#17427A;margin-bottom:6px;font-size:15px;">المساحة</div>
          <div style="font-size:12.5px;border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
            <span>إجمالي المساحة <span style="color:#6b7280;font-size:11px;">(شاملة نسبة التحميل)</span></span><b style="color:#9A7420;font-size:16px;">${fmt(a.total)} م²</b>
          </div>
          <div style="margin-top:10px;font-size:12.5px;line-height:1.9;">
            <div><b>${fmt(unit.plan.counts.bed)}</b> غرف نوم · <b>${fmt(unit.plan.counts.bath)}</b> حمامات · <b>${fmt(unit.plan.counts.balc)}</b> بلكونات</div>
            ${fac.length ? `<div>الواجهات: ${esc(fac.join(" · "))}</div>` : ""}
            ${hl.map((h) => `<div>✦ ${esc(h)}</div>`).join("")}
          </div>
        </div>
      </div>
      <div style="margin:14px 32px 0;padding:10px 14px;border-radius:10px;background:#FFF6E0;border:1px solid #EBCB7A;font-weight:800;font-size:13px;color:#5C4511;">${esc(ALLOCATION_NOTE)}</div>
      <div style="margin:12px 32px 0;display:flex;justify-content:space-between;align-items:center;font-size:13px;">
        <div>للاستفسار والأسعار: <b dir="ltr">${SALES_PHONES.join(" · ")}</b> (واتساب واتصال)</div>
        <div style="direction:ltr;color:#17427A;font-size:11px;">${esc(link)}</div>
      </div>
      <div style="margin:10px 32px 22px;font-size:9.5px;line-height:1.7;color:#6b7280;">${esc(DISCLAIMERS.join(" "))}</div>
    `;
    document.body.appendChild(page);
    try {
        await Promise.all(
            Array.from(page.querySelectorAll("img")).map(
                (img) => (img.complete ? Promise.resolve() : new Promise((r) => ((img.onload = r), (img.onerror = r))))
            )
        );
        const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#FFFFFF", useCORS: true, logging: false });
        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
        const W = pdf.internal.pageSize.getWidth();
        const H = (canvas.height * W) / canvas.width;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, Math.min(H, pdf.internal.pageSize.getHeight()));
        pdf.save(`Sanad-Zayed-${unit.code}.pdf`);
    } finally {
        page.remove();
    }
}
