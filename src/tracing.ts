import { NodeSdk } from "@effect/opentelemetry"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Config, Effect, Layer } from "effect"
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base"

export const TracingLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const apiKey = yield* Config.option(Config.string("HONEYCOMB_API_KEY"))
    const dataset = yield* Config.withDefault(
      Config.string("HONEYCOMB_DATASET"),
      "@3loop/decoder-server",
    )

    let traceExporterConfig: OTLPExporterNodeConfigBase | undefined
    let metricExporterConfig: OTLPExporterNodeConfigBase | undefined

    if (apiKey._tag === "Some") {
      const headers = {
        "X-Honeycomb-Team": apiKey.value,
        "X-Honeycomb-Dataset": apiKey.value,
      }
      traceExporterConfig = {
        url: "https://api.honeycomb.io/v1/traces",
        headers,
      }
      metricExporterConfig = {
        url: "https://api.honeycomb.io/v1/metrics",
        headers,
      }
    }

    return NodeSdk.layer(() => ({
      resource: {
        serviceName: dataset,
      },
      spanProcessor: new BatchSpanProcessor(
        new OTLPTraceExporter(traceExporterConfig),
      ),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(metricExporterConfig),
        exportIntervalMillis: 10_000,
      }),
    }))
  }),
)
