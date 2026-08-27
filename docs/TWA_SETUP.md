# ForenzDetectiv TWA / Google Play Setup

Tento dokument popisuje, ako z PWA vytvoriť Trusted Web Activity (TWA) pre Google Play (`sk.forenzdetectiv.twa`).

## Predpoklady

- Nasadená HTTPS produkčná URL: `https://forenz-detectiv.vercel.app` (alias `forenzdetectiv.vercel.app`; custom doména `forenzdetectiv.sk` — RB-06 / DNS)
- Node.js 20+
- Java JDK 17+
- Android SDK / Bubblewrap CLI

## 1. Ikony

V `public/icons/` sú PNG:

- `icon-192.png`
- `icon-512.png` (maskable)

Regenerácia (voliteľné):

```bash
node scripts/generate-icons.mjs
```

## 2. Digital Asset Links

Súbor: [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json)

1. Vytvor Android keystore (upload key) cez Bubblewrap alebo Android Studio.
2. Získaj SHA-256 fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias android
```

3. Nahraď hodnotu `REPLACE_WITH_UPLOAD_KEY_SHA256` skutočným fingerprintom (formát `AA:BB:...`).
4. Over na produkcii: `https://forenz-detectiv.vercel.app/.well-known/assetlinks.json`

## 3. Bubblewrap init

```bash
npm i -g @bubblewrap/cli
cd android
npx bubblewrap init --manifest=../public/manifest.json
# alebo použi existujúci twa-manifest.json:
npx bubblewrap build
```

Package ID: `sk.forenzdetectiv.twa`  
Start URL: `/`  
Theme / background: `#020617`

## 4. Play Console

1. Vytvor aplikáciu v Google Play Console (kategória Productivity / Tools).
2. Nahraj AAB z `android/app/build/outputs/bundle/release/`.
3. Skopíruj ASO texty z [`docs/ASO_METADATA.md`](ASO_METADATA.md) (SK + CZ).
4. Nastav Privacy Policy URL a Data safety (žiadne session recording; PostHog privacy-first).

## 5. Smoke checklist

- [ ] `assetlinks.json` vracia 200 na produkcii
- [ ] TWA otvorí app bez Chrome URL bar (Digital Asset Links verified)
- [ ] Offline PWA fallback funguje
- [ ] Ikony 192/512 sú viditeľné na launcheri
