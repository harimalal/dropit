function supabaseHeaders(env) {
  return {
    "Content-Type": "application/json",
    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const deviceId = url.searchParams.get("device_id");

  if (!deviceId) {
    return new Response(JSON.stringify({ error: "device_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const res = await fetch(
    env.SUPABASE_URL + "/rest/v1/dropit_projects?device_id=eq." + encodeURIComponent(deviceId) + "&select=data",
    { headers: supabaseHeaders(env) }
  );

  const rows = await res.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return new Response(JSON.stringify({ data: { projects: [] } }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ data: rows[0].data }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { device_id, state } = body;
  if (!device_id || !state) {
    return new Response(JSON.stringify({ error: "device_id and state required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const res = await fetch(
    env.SUPABASE_URL + "/rest/v1/dropit_projects",
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(env),
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        device_id: device_id,
        data: state,
        updated_at: new Date().toISOString()
      })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
