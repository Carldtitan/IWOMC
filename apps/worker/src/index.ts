import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

interface WorkerBindings {
  Bindings: Env;
}

export interface IngestPointer {
  readonly objectKey: string;
  readonly objectDigest: string;
  readonly workspaceId: string;
}

const app = new Hono<WorkerBindings>();

app.use("*", secureHeaders());

app.get("/", (context) => {
  const origin = new URL(context.req.url).origin;

  return context.json({
    name: "Environment Reconciler",
    status: "foundation-ready",
    message: "The control-plane foundation is running.",
    health: `${origin}/health`,
    github: {
      callback: `${origin}/v1/auth/github/callback`,
      setup: `${origin}/v1/auth/github/setup`,
      webhook: `${origin}/v1/github/webhook`
    }
  });
});

app.get("/health", (context) =>
  context.json({
    ok: true,
    service: "environment-reconciler",
    stage: "foundation"
  })
);

app.get("/v1/auth/github/start", (context) =>
  context.json(
    {
      error: "github_app_not_configured",
      message: "Configure the GitHub App credentials before starting OAuth."
    },
    503
  )
);

app.get("/v1/auth/github/callback", (context) =>
  context.json(
    {
      error: "github_app_not_configured",
      message: "The callback route is reserved and awaiting GitHub App credentials."
    },
    503
  )
);

app.get("/v1/auth/github/setup", (context) =>
  context.json({
    ok: true,
    message: "GitHub App installation setup route is reserved."
  })
);

app.post("/v1/github/webhook", (context) =>
  context.json(
    {
      error: "github_app_not_configured",
      message: "Webhook verification is unavailable until the webhook secret is configured."
    },
    503
  )
);

app.notFound((context) =>
  new URL(context.req.url).pathname.startsWith("/v1/")
    ? context.json(
        {
          error: "not_found",
          path: new URL(context.req.url).pathname
        },
        404
      )
    : context.env.ASSETS.fetch(context.req.raw)
);

app.onError((error, context) => {
  console.error(
    JSON.stringify({
      message: "unhandled request error",
      kind: error instanceof Error ? "error" : "unknown_throwable",
      path: new URL(context.req.url).pathname
    })
  );

  return context.json({ error: "internal_server_error" }, 500);
});

const worker = {
  fetch: app.fetch,
  queue(batch: MessageBatch<IngestPointer>): void {
    for (const message of batch.messages) {
      console.error(
        JSON.stringify({
          message: "queue consumer not implemented",
          queue: batch.queue,
          messageId: message.id
        })
      );
      message.retry({ delaySeconds: 60 });
    }
  }
} satisfies ExportedHandler<Env, IngestPointer>;

export { ValidationWorkflow } from "./workflows/validation.js";
export default worker;
