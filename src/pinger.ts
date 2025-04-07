import config from "./config";
import * as logger from "./logger";
import ping from "ping";

type ServerResult = {
    packetLost: boolean;
    time: number;
};

type PingResult = {
    minPing: number;
    maxPing: number;
    averagePing: number;
    sent: number;
    received: number;
    lost: number;
    timestamp: string;
};

export class Pinger {
    private discardFirstResults: boolean = true;

    private recentHistory: PingResult[] = [];
    private recentWorstAverage: number = 0;
    private recentHighLatencyCount: number = 0;

    /**
     * @param onPingResults Callback function to handle ping results. Server results are in the same order as the servers in config.json.
     */
    constructor(private onPingResults: (result: PingResult, serverResults: ServerResult[]) => void) {
        this.pingServers();

        setInterval(() => {
            this.pingServers();
        }, config.ping_interval_seconds * 1000);

        setTimeout(() => {
            this.discardFirstResults = false;
        }, config.startup_ignore_seconds * 1000);
    }

    private addToPingHistory(result: PingResult) {
        this.recentHistory.push(result);

        if (result.averagePing > config.warning_threshold) {
            this.recentHighLatencyCount++;
        }

        if (result.averagePing > this.recentWorstAverage) {
            this.recentWorstAverage = result.averagePing;
        }

        const cutOffDate = new Date(Date.now() - config.ping_history_length_seconds * 1000).toISOString();

        while (this.recentHistory.length > 0 && this.recentHistory[0].timestamp < cutOffDate) {
            const removedResult = this.recentHistory.shift();
            if (removedResult.averagePing > config.warning_threshold) {
                this.recentHighLatencyCount--;
            }

            if (removedResult.averagePing === this.recentWorstAverage) {
                this.findMaxValues();
            }
        }
    }

    private findMaxValues() {
        this.recentWorstAverage = Math.max(...this.recentHistory.map((result) => result.averagePing));
    }

    public get maxAverage() {
        return this.recentWorstAverage;
    }

    public get latencyIssuesCount() {
        return this.recentHighLatencyCount;
    }
    }

    private async pingServers() {
        try {
            const pingResults = await Promise.all(
                config.servers.map((server) =>
                    ping.promise.probe(server, {
                        timeout: config.ping_timeout_seconds,
                    })
                )
            );

            if (this.discardFirstResults) {
                // This is done because because often the first ping is very high
                // It could be cause of DNS lookup, at least on Windows but not sure
                logger.print(
                    `Ignored ping result, waiting for ${config.startup_ignore_seconds} seconds to start monitoring`
                );
                return;
            }

            const results = {
                minPing: Infinity,
                maxPing: -Infinity,
                averagePing: 0,
                sent: pingResults.length,
                received: 0,
                lost: 0,
                timestamp: new Date().toISOString(),
            };

            const serverResults = [];

            for (const result of pingResults) {
                const packetLost = result.times.length === 0;
                const time = packetLost ? Infinity : result.times[0];

                if (packetLost) {
                    results.lost++;
                } else {
                    results.received++;
                    results.averagePing += time;
                    results.minPing = Math.min(results.minPing, time);
                    results.maxPing = Math.max(results.maxPing, time);
                }

                serverResults.push({
                    packetLost,
                    time,
                });
            }

            results.averagePing /= results.received;
            results.minPing = results.received > 0 ? results.minPing : Infinity;
            results.maxPing = results.received > 0 ? results.maxPing : Infinity;
            results.averagePing = results.received > 0 ? results.averagePing : Infinity;

            this.addToPingHistory(results);
            this.onPingResults(results, serverResults);
        } catch (err) {
            logger.error("Failed to ping servers: ", err);
        }
    }
}
