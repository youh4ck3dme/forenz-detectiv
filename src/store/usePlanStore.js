import { create } from 'zustand';
import { isMonetizationEnabled } from '@/lib/monetization';

const getStoredPlan = () => {
  if (typeof window === 'undefined') return 'free';
  return localStorage.getItem('forenz_user_plan') || 'free';
};

const getStoredUserId = () => {
  if (typeof window === 'undefined') return 'anonymous';
  let uid = localStorage.getItem('forenz_user_id');
  if (!uid) {
    uid = 'ADV-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    localStorage.setItem('forenz_user_id', uid);
  }
  return uid;
};

const getCaseCount = () => {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem('forenz_case_count') || '0') || 0;
};

export const usePlanStore = create((set, get) => ({
  plan: getStoredPlan(), // 'free' | 'pro' | 'agency'
  userId: getStoredUserId(),
  caseCount: getCaseCount(),
  pricingModalOpen: false,
  paywallReason: null,

  setPricingModalOpen: (open, reason = null) => {
    if (!isMonetizationEnabled) {
      set({ pricingModalOpen: false, paywallReason: null });
      return;
    }
    set({ pricingModalOpen: open, paywallReason: reason });
  },

  upgradePlan: (newPlan) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forenz_user_plan', newPlan);
    }
    set({ plan: newPlan, pricingModalOpen: false, paywallReason: null });
  },

  incrementCaseCount: () => {
    const next = get().caseCount + 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem('forenz_case_count', String(next));
    }
    set({ caseCount: next });
    return next;
  },

  // Hard-disabled monetization: unlimited cases/docs for production testing
  canCreateCase: () => true,
  canAddDocument: () => true,

  getReferralLink: () => {
    const { userId } = get();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://forenz-detectiv.vercel.app';
    return `${origin}?ref=${userId}`;
  },

  captureReferralCode: () => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (!ref) return;
    localStorage.setItem('forenz_incoming_ref', ref);
  }
}));
