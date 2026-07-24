const endpoint = `${process.env.FIREWORKS_BASE_URL}/chat/completions`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: process.env.FIREWORKS_MODEL_ID,
    max_tokens: 32,
    temperature: 0,
    messages: [{ role: "user", content: "Return JSON with ok set to true." }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "environment_reconciler_smoke",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: { ok: { type: "boolean" } },
          required: ["ok"]
        }
      }
    }
  })
});

let body;
try {
  body = await response.json();
} catch {
  body = {};
}
const content = body?.choices?.[0]?.message?.content;
let structured = false;
try {
  structured = JSON.parse(content)?.ok === true;
} catch {
  structured = false;
}
const ok = response.ok && structured;
console.log(
  JSON.stringify({
    ok,
    authenticated: response.status !== 401 && response.status !== 403,
    status: response.status,
    model: body?.model ?? null,
    finishReason: body?.choices?.[0]?.finish_reason ?? null,
    structured
  })
);
if (!ok) {
  process.exit(1);
}
