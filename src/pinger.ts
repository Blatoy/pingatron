import config from "./config";
import * as logger from "./logger";
import ping from "ping";

type ServerResult = {
    serverName: string;
    packetLost: boolean;
    pingTime: number;
};

type PingResult = {
    minPing: number;
    maxPing: number;
    averagePing: number;
    sent: number;
    received: number;
    lost: number;
    serverResults: ServerResult[]
    timestamp: string;
};

export enum Status {
    ok = 0,
    warning = 1,
    error = 2,
}

export class Pinger {
    private discardFirstResults: boolean = true;

    private recentHistory: PingResult[] = [];
    private recentWorstAverage: number = 0;
    private recentHighLatencyCount: number = 0;

    private recentIssuesPerServer: {
        latencyStatus: Status;
        issueCountStatus: Status;
        serverName: string
        worstPing: number
        highLatencyCount: number
    }[] = [];

    private lastPingResult: PingResult | null = null;

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

        this.recentIssuesPerServer = [];
        for (let serverName of config.servers) {
            this.recentIssuesPerServer.push({
                serverName: serverName,
                worstPing: 0,
                highLatencyCount: 0,
                issueCountStatus: Status.ok,
                latencyStatus: Status.ok
            });
        }

        for (const pingResult of this.recentHistory) {
            for (let i = 0; i < pingResult.serverResults.length; i++) {
                const serverIssue = this.recentIssuesPerServer[i];
                const serverResult = pingResult.serverResults[i];

                if (serverResult.pingTime > serverIssue.worstPing) {
                    serverIssue.worstPing = serverResult.pingTime;
                }

                if (serverResult.pingTime > config.warning_threshold) {
                    serverIssue.highLatencyCount++;
                }

                if (serverIssue.worstPing > config.error_threshold) {
                    serverIssue.latencyStatus = Status.error;
                } else if (serverIssue.worstPing > config.warning_threshold) {
                    serverIssue.latencyStatus = Status.warning;
                }

                if (serverIssue.highLatencyCount > 5) {
                    serverIssue.issueCountStatus = Status.error;
                } else if (serverIssue.highLatencyCount > 0) {
                    serverIssue.issueCountStatus = Status.warning;
                }
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

    public get lastResult() {
        return this.lastPingResult;
    }

    public get recentServerIssues() {
        return this.recentIssuesPerServer;
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

            const results: PingResult = {
                minPing: Infinity,
                maxPing: -Infinity,
                averagePing: 0,
                sent: pingResults.length,
                received: 0,
                lost: 0,
                serverResults: [],
                timestamp: new Date().toISOString(),
            };

            const serverResults: ServerResult[] = [];

            for (let i = 0; i < pingResults.length; i++) {
                const result = pingResults[i];
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
                    serverName: config.servers[i],
                    packetLost,
                    pingTime: time,
                });
            }

            results.serverResults = serverResults;
            results.averagePing /= results.received;
            results.minPing = results.received > 0 ? results.minPing : Infinity;
            results.maxPing = results.received > 0 ? results.maxPing : Infinity;
            results.averagePing = results.received > 0 ? results.averagePing : Infinity;

            this.lastPingResult = results;
            this.addToPingHistory(results);
            this.onPingResults(results, serverResults);
        } catch (err) {
            logger.error("Failed to ping servers: ", err);
        }
    }
}
