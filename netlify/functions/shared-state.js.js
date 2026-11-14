import { getStore } from '@netlify/blobs';

/**
 * Perimeter Desk — Netlify Blobs Ortak Bulut Depolama Servisi
 * Siteye giren tüm cihazların 9 Saha, Haftalık Program ve Fikstür skorlarını
 * merkezi olarak okuyup güncellemesini sağlar.
 */
export default async (req, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Hem CLI/Git deploy hem de sürükle-bırak (Drag & Drop) deploylarda Blobs store'u güvenle aç
    const store = getStore({
      name: 'perimeter-desk-shared',
      consistency: 'strong'
    });
    const stateKey = 'live_state_v1';

    if (req.method === 'GET') {
      const existing = await store.get(stateKey, { type: 'json' });
      return new Response(
        JSON.stringify({ ok: true, data: existing || null }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'POST') {
      const incoming = await req.json();
      if (!incoming || typeof incoming !== 'object') {
        return new Response(
          JSON.stringify({ ok: false, error: 'Geçersiz veri formatı' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const current = (await store.get(stateKey, { type: 'json' })) || {};
      const merged = {
        ...current,
        ...incoming,
        updatedAt: Date.now()
      };

      await store.setJSON(stateKey, merged);

      return new Response(
        JSON.stringify({ ok: true, data: merged }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Desteklenmeyen HTTP metodu' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err && err.message ? err.message : 'Netlify Blobs depolama hatası'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};