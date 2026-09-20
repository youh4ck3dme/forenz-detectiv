import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { getStoredUtmParameters } from '@/utils/utmTracker';
import { trackEvent } from '@/lib/analytics';

export default function LeadCaptureModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    firm: '',
    email: '',
    lawyersCount: '1-5'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const utmParams = getStoredUtmParameters();
    const payload = {
      ...formData,
      utm: utmParams,
      submittedAt: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('forenz_leads') || '[]');
      existing.unshift(payload);
      localStorage.setItem('forenz_leads', JSON.stringify(existing.slice(0, 50)));
    } catch {
      // ignore storage failures
    }

    trackEvent('lead_captured', {
      source: 'pilot_modal',
      has_email: !!formData.email,
      lawyers_count: formData.lawyersCount,
      utm_source: utmParams.utm_source || 'direct'
    });

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-500">
            <Building2 className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold text-slate-900">
              14-Dňový Pilot pre Advokátske Kancelárie
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-xs">
            Získajte plnohodnotný prístup k ForenzDetectiv Pro pre vašu kanceláriu s neobmedzenou analýzou a prioritnou podporou.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Žiadosť bola odoslaná!</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Náš tím vás bude kontaktovať do 24 hodín na e-mail <strong className="text-slate-800">{formData.email}</strong> s prístupovými údajmi.
            </p>
            <Button
              type="button"
              onClick={onClose}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              Hotovo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 my-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-medium">Meno a priezvisko</label>
              <input
                type="text"
                required
                placeholder="JUDr. Meno Priezvisko"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-medium">Názov kancelárie / inštitúcie</label>
              <input
                type="text"
                required
                placeholder="Názov advokátskej kancelárie"
                value={formData.firm}
                onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-medium">Pracovný e-mail</label>
              <input
                type="email"
                required
                placeholder="kovac@ak-partners.sk"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-medium">Počet právnikov / vyšetrovateľov v tíme</label>
              <select
                value={formData.lawyersCount}
                onChange={(e) => setFormData({ ...formData, lawyersCount: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="1-5">1 – 5 právnikov</option>
                <option value="6-15">6 – 15 právnikov</option>
                <option value="16+">Viac ako 16 právnikov / Inštitúcia</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-900 text-xs">
                Zrušiť
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-2 shadow-lg shadow-amber-500/20"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Aktivovať 14-dňový pilot
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
