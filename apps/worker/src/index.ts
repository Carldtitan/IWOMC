import { Hono, type Handler } from "hono";
import { secureHeaders } from "hono/secure-headers";

import { createDemoSponsorRunRoutes } from "./api/demo-sponsor-run/routes.js";
import { createIngestionRoutes } from "./api/ingestion/index.js";
import { createUnavailableIntegrationStatusRoutes } from "./api/integration-status/index.js";
import {
  CloudflarePayloadProtection,
  CloudflareR2VerifiedObjectReader,
  HyperdrivePostgresConnectionFactory,
  HyperdriveProcessedBatchMarkerPersistence,
  createCloudflareIngestionApi
} from "./infrastructure/ingestion/index.js";
import {
  EventBatchConsumer,
  EventConsumerError,
  handleCloudflareEventBatch
} from "./queues/index.js";

interface WorkerBindings {
  Bindings: Env;
}

const app = new Hono<WorkerBindings>();

app.use("*", secureHeaders());

app.get("/", (context) => {
  const origin = new URL(context.req.url).origin;

  return context.json({
    name: "Environment Reconciler",
    status: "mvp-vertical-slice",
    message: "The evidence, reconciliation, candidate, and validation control plane is running.",
    health: `${origin}/health`,
    capabilities: `${origin}/v1/capabilities`,
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
    stage: "mvp-vertical-slice",
    bindings: {
      database: true,
      ingestQueue: true,
      objectStorage: true,
      validationWorkflow: true
    },
    integrations: {
      braintrust: context.env.BRAINTRUST_ENABLED === "true",
      daytona: context.env.DAYTONA_API_KEY.length > 0,
      fireworks: context.env.FIREWORKS_API_KEY.length > 0,
      github: context.env.GITHUB_APP_ID.length > 0
    }
  })
);

app.get("/v1/capabilities", (context) =>
  context.json({
    capture: [
      {
        provider: "codex",
        surface: "local-hook-v1",
        support: "native",
        rawPromptContent: false,
        privateReasoning: false
      }
    ],
    reconciliation: [
      {
        ecosystem: "npm",
        manager: "npm",
        support: "native_validation",
        rule: "dependency.used_but_undeclared"
      }
    ],
    sponsors: {
      braintrust: {
        configured: context.env.BRAINTRUST_ENABLED === "true",
        purpose: "metadata-only reasoning and validation observability"
      },
      daytona: {
        configured: context.env.DAYTONA_API_KEY.length > 0,
        purpose: "separate clean baseline and candidate reconstruction"
      },
      fireworks: {
        configured: context.env.FIREWORKS_API_KEY.length > 0,
        purpose: "schema-constrained candidate reasoning"
      }
    }
  })
);

const ingestRequest: Handler<WorkerBindings> = (context) => {
  const routes = createIngestionRoutes(createCloudflareIngestionApi(context.env));
  return routes.fetch(context.req.raw, context.env, context.executionCtx);
};

app.post("/v1/projects/:id/events/batches", ingestRequest);
app.get("/v1/devices/:id/status", ingestRequest);
app.route(
  "/",
  createDemoSponsorRunRoutes((environment) => ({
    async run(input) {
      const { createRuntimeDemoSponsorRunExecutor } =
        await import("./api/demo-sponsor-run/runtime.js");
      return createRuntimeDemoSponsorRunExecutor(environment).run(input);
    }
  }))
);
app.route("/", createUnavailableIntegrationStatusRoutes());

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
  async queue(batch: MessageBatch<unknown>, environment: Env): Promise<void> {
    let consumer;
    try {
      const protection = new CloudflarePayloadProtection(environment.DATA_ENCRYPTION_KEY);
      const connections = new HyperdrivePostgresConnectionFactory(
        environment.DATABASE.connectionString
      );
      consumer = new EventBatchConsumer({
        deadLetters: {
          publish: () =>
            Promise.reject(new EventConsumerError("direct_dead_letter_publish_unavailable", true))
        },
        objects: new CloudflareR2VerifiedObjectReader(environment.OBJECTS, protection),
        persistence: new HyperdriveProcessedBatchMarkerPersistence(connections),
        reconcileQueue: {
          publish: () => Promise.reject(new EventConsumerError("reconcile_queue_unavailable", true))
        }
      });
    } catch {
      consumer = {
        consume: () =>
          Promise.reject(new EventConsumerError("consumer_configuration_invalid", true))
      };
    }
    await handleCloudflareEventBatch(batch, consumer, (entry) => {
      console.error(
        JSON.stringify({ message: "ingest queue delivery not acknowledged", ...entry })
      );
    });
  }
} satisfies ExportedHandler<Env, unknown>;

export { ValidationWorkflow } from "./workflows/validation.js";
export default worker;
