import Fastify from "fastify";
import config from "./config";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { Weather } from "./weather";
import { Pinger } from "./pinger";

export class LiveView {
    private server = Fastify();

    constructor(private weather: Weather, private pinger: Pinger) {
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
            return 2; // Error
        } else if (this.pinger.maxAverage > config.warning_threshold) {
            return 1; // Warning
        }
        return 0; // OK
    }

    private getIssueCountStatus() {
        if (this.pinger.latencyIssuesCount > 5) {
            return 2; // Error
        } else if (this.pinger.latencyIssuesCount > 0) {
            return 1; // Warning
        }
        return 0; // OK
    }

    async start() {
        try {
            await this.server.listen({ port: config.liveView.port });
            console.log(`LiveView server is running on port ${config.liveView.port}`);
        } catch (err) {
            this.server.log.error(err);
            process.exit(1);
        }
    }
}
