import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, UserCheck, Clock, Globe, AlertTriangle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Späť do aplikácie
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        {/* Title */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ochrana osobných údajov
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Zásady ochrany súkromia
          </h1>
          <p className="text-slate-400 text-sm">
            Posledná aktualizácia: 16. august 2026 &middot; Verzia 1.0
            <br />
            V súlade s Nariadením (EÚ) 2016/679 (GDPR) a Zákonom č. 18/2018 Z. z.
          </p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-10">

          {/* 1 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <UserCheck className="w-5 h-5 text-blue-400" />
              1. Prevádzkovateľ
            </h2>
            <p className="text-slate-700">
              Prevádzkovateľom platformy <strong>Alibi</strong> je fyzická/právnická osoba
              so sídlom v Slovenskej republike (ďalej len „Prevádzkovateľ").
              Kontakt na zodpovednú osobu pre ochranu údajov: <strong>privacy@forenzdetectiv.sk</strong>
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <Database className="w-5 h-5 text-cyan-400" />
              2. Aké údaje spracovávame
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="py-3 pr-4 text-slate-700 font-semibold">Kategória</th>
                    <th className="py-3 pr-4 text-slate-700 font-semibold">Príklady údajov</th>
                    <th className="py-3 text-slate-700 font-semibold">Právny základ</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-b border-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-700">Účtové údaje</td>
                    <td className="py-3 pr-4">E-mail, meno (pri registrácii)</td>
                    <td className="py-3">Plnenie zmluvy (čl. 6(1)(b) GDPR)</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-700">Nahrané dokumenty</td>
                    <td className="py-3 pr-4">PDF, obrázky, textové súbory</td>
                    <td className="py-3">Plnenie zmluvy (čl. 6(1)(b) GDPR)</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-700">AI-extrahované dáta</td>
                    <td className="py-3 pr-4">Mená, miesta, časy, tvrdenia z dokumentov</td>
                    <td className="py-3">Oprávnený záujem (čl. 6(1)(f) GDPR)</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-700">Analytické dáta</td>
                    <td className="py-3 pr-4">Anonymizované udalosti použitia (PostHog)</td>
                    <td className="py-3">Súhlas (čl. 6(1)(a) GDPR)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-slate-700">Chybové hlásenia</td>
                    <td className="py-3 pr-4">Stack trace, typ prehliadača (Sentry)</td>
                    <td className="py-3">Oprávnený záujem (čl. 6(1)(f) GDPR)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <Eye className="w-5 h-5 text-indigo-400" />
              3. Účel spracovania
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li><strong>Poskytovanie služieb</strong> — AI analýza dokumentov, detekcia rozporov, vizualizácia vzťahov.</li>
              <li><strong>Zlepšovanie kvality</strong> — anonymizovaná analytika na zlepšenie UX (iba so súhlasom).</li>
              <li><strong>Bezpečnosť</strong> — detekcia a oprava chýb, ochrana pred zneužitím.</li>
              <li><strong>Fakturácia</strong> — po obnovení monetizácie spracovanie platieb cez Stripe (aktuálne pozastavené).</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <Lock className="w-5 h-5 text-amber-400" />
              4. AI spracovanie a EU AI Act
            </h2>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-4">
              <p className="text-amber-300 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Platforma Alibi využíva systémy umelej inteligencie v súlade s Nariadením (EÚ) 2024/1689
                  (EU AI Act). Systém je klasifikovaný ako <strong>nízke riziko</strong> — poskytuje
                  informačnú podporu, nie automatizované rozhodovanie.
                </span>
              </p>
            </div>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li>AI výstupy sú vždy <strong>jasne označené</strong> ako generované strojom.</li>
              <li>Žiadne automatizované rozhodovanie bez ľudského dohľadu (čl. 22 GDPR).</li>
              <li>Nahrané dokumenty sa spracovávajú výlučne pre účely analýzy a <strong>nie sú</strong> použité na trénovanie modelov.</li>
              <li>Dáta sa prenášajú šifrovane (TLS 1.3) a ukladajú v dátových centrách v EÚ.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <Clock className="w-5 h-5 text-purple-400" />
              5. Doba uchovávania
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li><strong>Účtové údaje:</strong> Po dobu trvania účtu + 30 dní po zrušení.</li>
              <li><strong>Nahrané dokumenty:</strong> Po dobu trvania prípadu. Vymazané do 30 dní po vymazaní používateľom.</li>
              <li><strong>Analytické dáta:</strong> Anonymizované, uchovávané max. 12 mesiacov.</li>
              <li><strong>Chybové hlásenia:</strong> Automaticky vymazané po 90 dňoch.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <Globe className="w-5 h-5 text-teal-400" />
              6. Príjemcovia údajov
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li><strong>Base44</strong> — cloudový backend (uloženie dát, autentifikácia).</li>
              <li><strong>Stripe</strong> — spracovanie platieb po obnovení monetizácie (vlastný spracovateľ podľa GDPR; aktuálne neaktívne).</li>
              <li><strong>PostHog Cloud (EÚ)</strong> — anonymizovaná analytika (iba so súhlasom).</li>
              <li><strong>Sentry</strong> — sledovanie chýb (anonymizované stack trace).</li>
              <li>Údaje <strong>nie sú</strong> predávané tretím stranám na marketingové účely.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              7. Práva dotknutej osoby
            </h2>
            <p className="text-slate-700 mb-3">Podľa GDPR máte nasledujúce práva:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Právo na prístup', desc: 'Získať kópiu svojich údajov.' },
                { label: 'Právo na opravu', desc: 'Opraviť nesprávne údaje.' },
                { label: 'Právo na výmaz', desc: '„Právo byť zabudnutý" — vymazanie údajov.' },
                { label: 'Právo na prenosnosť', desc: 'Export údajov v strojovo čitateľnom formáte.' },
                { label: 'Právo namietať', desc: 'Namietať proti spracovaniu na základe oprávneného záujmu.' },
                { label: 'Právo odvolať súhlas', desc: 'Kedykoľvek odvolať súhlas s analytikou.' },
              ].map((right) => (
                <div key={right.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 mb-1">{right.label}</p>
                  <p className="text-xs text-slate-400">{right.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-sm mt-4">
              Na uplatnenie práv nás kontaktujte na: <strong className="text-slate-800">privacy@forenzdetectiv.sk</strong>
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              8. Bezpečnosť údajov
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li>Šifrovanie pri prenose (TLS 1.3) a v pokoji (AES-256).</li>
              <li>Prístup k údajom len autorizovaným osobám na princípe najnižších oprávnení.</li>
              <li>Pravidelné bezpečnostné audity a penetračné testovanie.</li>
              <li>Lokálne offline ukladanie cez IndexedDB je šifrované na úrovni prehliadača.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              9. Podanie sťažnosti
            </h2>
            <p className="text-slate-700">
              Ak sa domnievate, že spracovanie vašich údajov porušuje GDPR, máte právo podať sťažnosť na:
            </p>
            <p className="mt-2 text-slate-700">
              <strong>Úrad na ochranu osobných údajov Slovenskej republiky</strong><br />
              Hraničná 12, 820 07 Bratislava<br />
              Web: <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">dataprotection.gov.sk</a>
            </p>
          </section>

          {/* Links */}
          <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
            <Link to="/terms" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">
              Všeobecné obchodné podmienky →
            </Link>
            <Link to="/" className="text-slate-400 hover:text-slate-700">
              Späť do aplikácie →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
