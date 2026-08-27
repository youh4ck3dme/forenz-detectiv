# Google Ads — SK / CZ ops checklist

UTM capture beží pri boote cez [`captureUtmParameters()`](../src/utils/utmTracker.js) (`sessionStorage` kľúč `forenz_utm_params`).

## UTM konvencia

| Parameter | Hodnota |
|-----------|---------|
| `utm_source` | `google` |
| `utm_medium` | `cpc` |
| `utm_campaign` | `sk_forenz_search` / `cz_forenz_search` / `sk_forenz_display` |
| `utm_term` | keyword (Search) |
| `utm_content` | ad variant / creative id |
| `ref` | referral user id (nie Ads; partner program) |

Príklad landing URL:

```
https://forenz-detectiv.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=sk_forenz_search&utm_content=v1
```

## Kampane (checklist)

### SK — Search

- [ ] Brand: „ForenzDetectiv“, „forenzný detektív AI“
- [ ] Intent: „analýza výpovedí“, „detekcia rozporov spis“, „nemožné alibi“
- [ ] Negatives: job boards, student essays, unrelated „detektív“
- [ ] Landing: `/` s upload CTA + „Chcem pilot“
- [ ] Conversion (proxy): PostHog `lead_captured` + `case_created` (nie PII)

### CZ — Search

- [ ] Brand + intent v češtine (`forenz_lang=cs` / LanguageSwitcher)
- [ ] `utm_campaign=cz_forenz_search`
- [ ] Rovnaký funnel ako SK

### Display / remarketing (neskôr)

- [ ] Audience: visited `/` but no `case_created` in 7d (PostHog cohort export)
- [ ] Creative: demo alibi BA↔KE, Trust Pack, Pro pricing

## Attribution v produkte

1. Ads → URL s UTM.
2. App boot → `captureUtmParameters()`.
3. Lead form → `lead_captured` s `utm_source` (bez emailu v PostHog).
4. Looker: join Ads cost (Google Ads connector) vs PostHog conversions.

## Privacy

- Do Ads / PostHog neposielať mená zo spisov, citáty ani e-maily leadov.
- E-mail leadu ostáva len v `localStorage` (`forenz_leads`) na zariadení / budúci CRM sync.
