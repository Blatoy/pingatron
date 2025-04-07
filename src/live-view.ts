import Fastify from "fastify";
import config from "./config";
import fastifyStatic from "@fastify/static";
import path from "path";
import * as logger from "./logger";

import { fileURLToPath } from "url";
import { Weather } from "./weather";
import { Pinger } from "./pinger";

enum Status {
    ok = 0,
    warning = 1,
    error = 2,
}

export class LiveView {
    private server = Fastify();

    constructor(weather: Weather, private pinger: Pinger) {
        this.server.register(fastifyStatic, {
            root: path.join(fileURLToPath(path.dirname(import.meta.url)), "www"),
        });

        this.server.get("/api/weather", async (request, reply) => {
            return weather.latest;
        });

        this.server.get("/api/ping", async (request, reply) => {
            return {
                maxAverage: pinger.maxAverage,
                issueCountStatus: this.getIssueCountStatus(),
                latencyStatus: this.getLatencyStatus(),
                historyLengthSeconds: config.ping_history_length_seconds,
                latencyIssuesCount: pinger.latencyIssuesCount,
                lastResult: pinger.lastResult,
            };
        });

        this.start();
    }

    private getLatencyStatus() {
        if (this.pinger.maxAverage > config.error_threshold) {
            return Status.error;
        } else if (this.pinger.maxAverage > config.warning_threshold) {
            return Status.warning;
        }
        return Status.ok;
    }

    private getIssueCountStatus() {
        if (this.pinger.latencyIssuesCount > 5) {
            return Status.error;
        } else if (this.pinger.latencyIssuesCount > 0) {
            return Status.warning;
        }
        return Status.ok;
    }

    async start() {
        try {
            await this.server.listen({ port: config.live_view.port, host: config.live_view.host });
            logger.print(`LiveView server is running on port ${config.live_view.port}`);
        } catch (err) {
            this.server.log.error(err);
            process.exit(1);
        }
    }
}
