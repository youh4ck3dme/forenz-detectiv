import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ForenzDetectiv from './ForenzDetectiv';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function SharedCase() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('loadSharedCase', { token });
        const data = res?.data;
        if (!data || data.error) {
          setState({ loading: false, error: (data && data.error) || 'Nepodarilo sa načítať zdieľaný prípad.', data: null });
          return;
        }
        setState({ loading: false, data, error: null });
      } catch (e) {
        setState({ loading: false, error: 'Nepodarilo sa načítať zdieľaný prípad: ' + (e?.message || 'neznáma chyba'), data: null });
      }
    })();
  }, [token]);

  if (state.loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-3 px-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p>{state.error}</p>
      </div>
    );
  }
  return (
    <ForenzDetectiv
      readOnly
      scope={state.data.scope}
      sharedBy={state.data.sharedBy}
      initialData={state.data}
    />
  );
}