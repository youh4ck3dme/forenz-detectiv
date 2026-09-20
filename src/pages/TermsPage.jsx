import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, ShieldCheck, Globe, AlertTriangle, FileText } from 'lucide-react';

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
            <Scale className="w-3.5 h-3.5" />
            Právny dokument
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Všeobecné obchodné podmienky
          </h1>
          <p className="text-slate-400 text-sm">
            Posledná aktualizácia: 16. august 2026 &middot; Verzia 1.0
          </p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-10">

          {/* 1 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              1. Úvodné ustanovenia
            </h2>
            <p>
              Tieto Všeobecné obchodné podmienky (ďalej len „VOP") upravujú práva a povinnosti
              medzi prevádzkovateľom platformy <strong>Alibi</strong> (ďalej len „Prevádzkovateľ")
              a fyzickou alebo právnickou osobou, ktorá platformu využíva (ďalej len „Používateľ").
            </p>
            <p>
              Platforma Alibi je webová aplikácia poskytujúca AI-podporovanú forenznu analýzu
              vyšetrovacích spisov, detekciu rozporov vo výpovediach, vizualizáciu vzťahov
              a verifikáciu alibi.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <Globe className="w-5 h-5 text-cyan-400" />
              2. Registrácia a používateľský účet
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li>Registrácia je dobrovoľná. Základné funkcie sú dostupné bez vytvorenia účtu.</li>
              <li>Používateľ je zodpovedný za správnosť poskytnutých údajov a za bezpečnosť svojich prihlasovacích údajov.</li>
              <li>Prevádzkovateľ si vyhradzuje právo zrušiť účet, ktorý porušuje tieto VOP.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              3. Poskytované služby
            </h2>
            <p>Platforma Alibi poskytuje nasledujúce služby:</p>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li><strong>AI analýza dokumentov</strong> — automatická extrakcia osôb, tvrdení, časových údajov a lokácií z nahratých dokumentov.</li>
              <li><strong>Detekcia rozporov</strong> — porovnávanie tvrdení naprieč výpoveďami a identifikácia nezrovnalostí.</li>
              <li><strong>Vizualizácia vzťahov</strong> — interaktívny graf prepojení medzi osobami.</li>
              <li><strong>Verifikácia alibi</strong> — geografická a časová analýza alibi.</li>
              <li><strong>Sherlock AI asistent</strong> — konverzačný AI agent pre vyšetrovacie otázky.</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-amber-300 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Výstupy platformy majú výlučne informačný a podporný charakter.</strong> Nenahradzujú
                  právne poradenstvo, forenzné znalecké posudky ani rozhodnutia orgánov činných v trestnom konaní.
                </span>
              </p>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              4. Povinnosti používateľa
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li>Používateľ nesmie nahrávať obsah porušujúci právne predpisy SR, EÚ alebo medzinárodné právo.</li>
              <li>Používateľ nesie plnú zodpovednosť za obsah nahratých dokumentov.</li>
              <li>Je zakázané používať platformu na účely obťažovania, šírenia dezinformácií alebo manipulácie dôkazov.</li>
              <li>Používateľ nesmie pokúšať sa o neautorizovaný prístup k systému alebo dátam iných používateľov.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              5. Platobné podmienky
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li>Základný plán je aktuálne bezplatný bez limitu dokumentov (ostré testovanie produkcie).</li>
              <li>Platené plány (Pro, Agency) cez Stripe sú dočasne pozastavené — aktivácia podľa prevádzkovateľa.</li>
              <li>Ceny budú uvedené vrátane DPH, pokiaľ nebude uvedené inak.</li>
              <li>Predplatné (po obnovení monetizácie) sa automaticky obnovuje, pokiaľ ho používateľ nezruší pred koncom fakturačného obdobia.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              6. Obmedzenie zodpovednosti
            </h2>
            <p className="text-slate-700">
              Prevádzkovateľ nezodpovedá za škody vzniknuté v dôsledku nesprávnej interpretácie
              výstupov AI analýzy, výpadkov služby, straty dát spôsobenej okolnosťami mimo kontrolu
              Prevádzkovateľa, ani za rozhodnutia prijaté na základe výstupov platformy.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              7. Duševné vlastníctvo
            </h2>
            <p className="text-slate-700">
              Platforma Alibi, jej zdrojový kód, dizajn, logá a obsah sú chránené autorským právom.
              Používateľ si zachováva vlastníctvo všetkých nahratých dokumentov.
              AI-generované výstupy (analýzy, grafy, reporty) sú licencované používateľovi na osobné
              alebo obchodné použitie v rámci plateného plánu.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              8. Ukončenie služby
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-slate-700">
              <li>Používateľ môže kedykoľvek zrušiť svoj účet.</li>
              <li>Prevádzkovateľ si vyhradzuje právo pozastaviť alebo zrušiť účet pri porušení VOP.</li>
              <li>Po zrušení účtu budú všetky dáta vymazané do 30 dní.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              9. Rozhodné právo a riešenie sporov
            </h2>
            <p className="text-slate-700">
              Tieto VOP sa riadia právnym poriadkom Slovenskej republiky. Spory sa budú riešiť
              prednostne mimosúdnou dohodou. V prípade súdneho sporu je príslušný súd podľa sídla
              Prevádzkovateľa.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              10. Záverečné ustanovenia
            </h2>
            <p className="text-slate-700">
              Prevádzkovateľ si vyhradzuje právo tieto VOP kedykoľvek zmeniť. O zmenách bude
              Používateľ informovaný prostredníctvom platformy. Pokračovaním v používaní služby
              po zmene VOP vyjadruje Používateľ súhlas s novým znením.
            </p>
          </section>

          {/* Links */}
          <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
            <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">
              Zásady ochrany súkromia →
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
