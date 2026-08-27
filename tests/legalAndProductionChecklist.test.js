import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Readiness & Legal P0 Checklist Test Suite', () => {

  test('1. index.html obsahuje platné OpenGraph, Twitter a CSP meta tagy', () => {
    const indexPath = path.resolve('index.html');
    assert.strictEqual(fs.existsSync(indexPath), true, 'index.html musí existovať');
    const content = fs.readFileSync(indexPath, 'utf-8');

    // OpenGraph
    assert.match(content, /property="og:title"/, 'Musí obsahovať og:title');
    assert.match(content, /property="og:description"/, 'Musí obsahovať og:description');
    assert.match(content, /property="og:image"/, 'Musí obsahovať og:image');
    assert.match(content, /property="og:type"/, 'Musí obsahovať og:type');

    // Twitter Card
    assert.match(content, /name="twitter:card"/, 'Musí obsahovať twitter:card');
    assert.match(content, /name="twitter:title"/, 'Musí obsahovať twitter:title');

    // CSP
    assert.match(content, /http-equiv="Content-Security-Policy"/, 'Musí obsahovať CSP hlavičku');
    assert.match(content, /default-src 'self'/, 'CSP musí povoliť self');
    assert.match(content, /https:\/\/eu\.i\.posthog\.com/, 'CSP musí povoliť PostHog');
    assert.doesNotMatch(content, /https:\/\/js\.stripe\.com/, 'CSP nesmie vyžadovať Stripe.js (monetizácia paused)');
    assert.match(content, /https:\/\/vercel\.live/, 'CSP musí povoliť Vercel Live');

    // Mobile Web App Meta
    assert.match(content, /name="mobile-web-app-capable"/, 'Musí obsahovať moderný mobile-web-app-capable tag');
  });

  test('2. public/sitemap.xml existuje a obsahuje všetky kľúčové trasy', () => {
    const sitemapPath = path.resolve('public/sitemap.xml');
    assert.strictEqual(fs.existsSync(sitemapPath), true, 'sitemap.xml musí existovať');
    const content = fs.readFileSync(sitemapPath, 'utf-8');

    assert.match(content, /<loc>https:\/\/forenz-detectiv\.vercel\.app\/<\/loc>/, 'Obsahuje root');
    assert.match(content, /<loc>https:\/\/forenz-detectiv\.vercel\.app\/dashboard<\/loc>/, 'Obsahuje dashboard');
    assert.match(content, /<loc>https:\/\/forenz-detectiv\.vercel\.app\/terms<\/loc>/, 'Obsahuje terms');
    assert.match(content, /<loc>https:\/\/forenz-detectiv\.vercel\.app\/privacy<\/loc>/, 'Obsahuje privacy');
  });

  test('3. public/manifest.json je aktualizovaný na Alibi', () => {
    const manifestPath = path.resolve('public/manifest.json');
    assert.strictEqual(fs.existsSync(manifestPath), true, 'manifest.json musí existovať');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    assert.strictEqual(manifest.short_name, 'Alibi');
    assert.match(manifest.name, /Alibi/);
    assert.strictEqual(manifest.display, 'standalone');
  });

  test('4. Právne podstránky TermsPage.jsx a PrivacyPage.jsx existujú a obsahujú GDPR náležitosti', () => {
    const termsPath = path.resolve('src/pages/TermsPage.jsx');
    const privacyPath = path.resolve('src/pages/PrivacyPage.jsx');

    assert.strictEqual(fs.existsSync(termsPath), true, 'TermsPage.jsx musí existovať');
    assert.strictEqual(fs.existsSync(privacyPath), true, 'PrivacyPage.jsx musí existovať');

    const termsContent = fs.readFileSync(termsPath, 'utf-8');
    const privacyContent = fs.readFileSync(privacyPath, 'utf-8');

    assert.match(termsContent, /Všeobecné obchodné podmienky/);
    assert.match(termsContent, /Alibi/);

    assert.match(privacyContent, /Zásady ochrany súkromia/);
    assert.match(privacyContent, /GDPR/);
    assert.match(privacyContent, /Nariadením \(EÚ\) 2016\/679/);
    assert.match(privacyContent, /EU AI Act/);
  });

  test('5. CookieConsentBanner má funkciu hasAnalyticsConsent a korektné logiky súhlasu', () => {
    const bannerPath = path.resolve('src/components/CookieConsentBanner.jsx');
    assert.strictEqual(fs.existsSync(bannerPath), true, 'CookieConsentBanner.jsx musí existovať');
    const content = fs.readFileSync(bannerPath, 'utf-8');

    assert.match(content, /alibi_cookie_consent/);
    assert.match(content, /hasAnalyticsConsent/);
    assert.match(content, /cookie-consent-granted/);
  });
});
