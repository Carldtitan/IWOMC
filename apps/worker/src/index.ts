import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

type WorkerBindings = {
  Bindings: Env;
};

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
    service: "environment-REDACTED",
    stage: "foundation"
  })
);

app.get("/v1/auth/github/start", (context) =>
  context.json(
    {
      error: "github_app_not_configured",
      message: "Configure the GitHub App REDACTEDs before starting OAuth."
    },
    503
  )
);

app.get("/v1/auth/github/callback", (context) =>
  context.json(
    {
      error: "github_app_not_configured",
      message: "The callback route is reserved and awaiting GitHub App REDACTEDs."
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
      message: "Webhook verification is unavailable until the webhook REDACTED is configured."
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
      error: error instanceof Error ? error.message : String(error),
      path: new URL(context.req.url).pathname
    })
  );

  return context.json({ error: "internal_server_error" }, 500);
});

const worker = {
  fetch: app.fetch,
  async queue(batch: MessageBatch<IngestPointer>): Promise<void> {
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
