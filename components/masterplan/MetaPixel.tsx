"use client";

import Script from "next/script";

/**
 * Meta (Facebook) Pixel for retargeting visitors of the interactive plan.
 * Switched on by setting NEXT_PUBLIC_META_PIXEL_ID (the dataset ID from Meta Events Manager);
 * renders nothing until then. Events are sent from components/masterplan/journey.ts.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function MetaPixel() {
    if (!PIXEL_ID || !/^\d{5,20}$/.test(PIXEL_ID)) return null;
    return (
        <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
    );
}
