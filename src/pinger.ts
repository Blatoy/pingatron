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

            this.onPingResults(results, serverResults);
        } catch (err) {
            logger.error("Failed to ping servers: ", err);
        }
    }
}
