import Fastify from "fastify";
import config from "./config";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
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

        this.server.get("/api/history", async (request, reply) => {
            return await this.getHistory();
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

    private getHistory() {
        // TODO: Convert to async/await
        return new Promise((resolve, reject) => {
            fs.readdir(`${config.result_folder_path}/all`, (err, files) => {
                if (err) {
                    logger.error("Failed to read history directory", err);
                } else {
                    const results: {
                        date: string;
                        packetsSent: number;
                        packetsReceived: number;
                        packetsLost: number;
                        latePackets: number;
                        latencyIssues: { time: string; average: number; min: number; max: number }[];
                    }[] = [];

                    files.forEach((file) => {
                        const data = fs.readFileSync(`${config.result_folder_path}/all/${file}`, "utf8");
                        if (err) {
                            logger.error("Failed to read history file", err);
                        } else {
                            const lines = data.split("\n").splice(1); // Remove header line

                            let packetsSent = 0;
                            let packetsReceived = 0;
                            let packetsLost = 0;
                            let latePackets = 0;
                            let latencyIssues = [];

                            // timestamp,weatherTimestamp,temperature,relativeHumidity,isDay,precipitation,rain,shower,snowfall,surfacePressure,sentCount,receivedCount,lostCount,minPing,avgPing,maxPing
                            for (const line of lines) {
                                const columns = line.split(",");
                                const average = parseFloat(columns[13]);
                                const sent = parseInt(columns[10]);
                                const received = parseInt(columns[11]);
                                const lost = parseInt(columns[12]);
                                const min = parseFloat(columns[14]);
                                const max = parseFloat(columns[15]);

                                if (
                                    isNaN(average) ||
                                    isNaN(sent) ||
                                    isNaN(received) ||
                                    isNaN(lost) ||
                                    isNaN(min) ||
                                    isNaN(max)
                                ) {
                                    continue;
                                }

                                packetsSent += sent;
                                packetsReceived += received;
                                packetsLost += lost;

                                if (average > config.warning_threshold) {
                                    latePackets++;

                                    const date = new Date(Date.parse(columns[0]));

                                    latencyIssues.push({
                                        time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`,
                                        average: average,
                                        min: min,
                                        max: max,
                                    });
                                }
                            }

                            results.push({
                                date: file.split(".")[0],
                                packetsSent: packetsSent,
                                packetsReceived: packetsReceived,
                                packetsLost: packetsLost,
                                latePackets: latePackets,
                                latencyIssues: latencyIssues,
                            });
                        }
                    });

                    resolve(results);
                }
            });
        });
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
