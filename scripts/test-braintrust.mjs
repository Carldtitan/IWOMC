const base = new URL(process.env.BRAINTRUST_API_URL);
const endpoint = new URL("v1/project", base.toString().endsWith("/") ? base : `${base}/`);
endpoint.searchParams.set("project_name", process.env.BRAINTRUST_PROJECT_NAME);
const response = await fetch(endpoint, {
  headers: { Authorization: `Bearer ${process.env.BRAINTRUST_API_KEY}` }
});
let body;
try {
  body = await response.json();
} catch {
  body = {};
}
const ok = response.ok && Array.isArray(body?.objects);
console.log(
  JSON.stringify({
    ok,
    authenticated: response.status !== 401 && response.status !== 403,
    status: response.status,
    matchingProjects: Array.isArray(body?.objects) ? body.objects.length : 0
  })
);
if (!ok) {
  process.exit(1);
}
