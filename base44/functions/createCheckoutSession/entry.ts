import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function (req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const { plan = 'pro', interval = 'month', successUrl, cancelUrl } = body || {};

    const stripeSecretKey = secrets.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({
        error: 'Stripe Secret Key nie je nakonfigurovaný. Checkout nie je dostupný.'
      }, { status: 503 });
    }

    const priceMap: Record<string, { name: string; amount: number }> = {
      pro_month: { name: 'Forenz Detektív PRO Advokát (Mesačné predplatné)', amount: 4900 },
      pro_year: { name: 'Forenz Detektív PRO Advokát (Ročné predplatné - 20% zľava)', amount: 47000 },
      team_month: { name: 'Forenz Detektív Tím Vyšetrovateľov (Mesačne)', amount: 14900 },
      team_year: { name: 'Forenz Detektív Tím Vyšetrovateľov (Ročne)', amount: 143000 }
    };

    const planKey = `${plan}_${interval}`;
    const item = priceMap[planKey] || priceMap.pro_month;

    // Direct Stripe API call
    const params = new URLSearchParams();
    params.append('payment_method_types[0]', 'card');
    params.append('mode', 'subscription');
    params.append('line_items[0][price_data][currency]', 'eur');
    params.append('line_items[0][price_data][product_data][name]', item.name);
    params.append('line_items[0][price_data][unit_amount]', String(item.amount));
    params.append('line_items[0][price_data][recurring][interval]', interval === 'year' ? 'year' : 'month');
    params.append('line_items[0][quantity]', '1');
      params.append('success_url', successUrl || 'https://forenz-detectiv.vercel.app/?payment=success&session_id={CHECKOUT_SESSION_ID}');
      params.append('cancel_url', cancelUrl || 'https://forenz-detectiv.vercel.app/?payment=cancelled');
    
    if (user?.email) {
      params.append('customer_email', user.email);
    }
    params.append('metadata[user_id]', user?.id || 'anonymous');
    params.append('metadata[plan]', plan);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const sessionData = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error('[Stripe] Session creation failed:', sessionData);
      return Response.json({ error: sessionData.error?.message || 'Stripe checkout creation failed' }, { status: 400 });
    }

    return Response.json({
      id: sessionData.id,
      url: sessionData.url
    });
  } catch (err: any) {
    console.error('[Stripe] Server error:', err);
    return Response.json({ error: err?.message || 'Interná chyba servera' }, { status: 500 });
  }
}
