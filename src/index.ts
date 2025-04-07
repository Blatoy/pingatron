import * as logger from "./logger";

import { Pinger } from "./pinger";
import { Weather } from "./weather";
import { ResultWriter } from "./result-writer";
import config from "./config";

const allResultHeaders = [
    "timestamp",
    "weatherTimestamp",
    "temperature",
    "relativeHumidity",
    "isDay",
    "precipitation",
    "rain",
    "shower",
    "snowfall",
    "surfacePressure",
    "sentCount",
    "receivedCount",
    "lostCount",
    "minPing",
    "avgPing",
    "maxPing",
];

const serverResultHeaders = [
    "timestamp",
    "weatherTimestamp",
    "temperature",
    "relativeHumidity",
    "isDay",
    "precipitation",
    "rain",
    "shower",
    "snowfall",
    "surfacePressure",
    "packetLost",
    "time",
];

async function main() {
    logger.log("Pingatron started");

    const weather = new Weather();
    await weather.refresh();

    const resultWriter = new ResultWriter("all", allResultHeaders);
    const serverResultWriters = config.servers.map((serverName) => {
        return new ResultWriter(serverName, serverResultHeaders);
    });

    new Pinger((result, serverResults) => {
        const weatherData = [
            weather.latest.time,
            weather.latest.temperature_2m,
            weather.latest.relative_humidity_2m,
            weather.latest.is_day,
            weather.latest.precipitation,
            weather.latest.rain,
            weather.latest.showers,
            weather.latest.snowfall,
            weather.latest.surface_pressure,
        ];

        resultWriter.appendCSVEntry([
            result.timestamp,
            ...weatherData,
            result.sent,
            result.received,
            result.lost,
            result.minPing,
            result.averagePing,
            result.maxPing,
        ]);

        serverResults.forEach((serverResult, index) => {
            serverResultWriters[index].appendCSVEntry([
                result.timestamp,
                ...weatherData,
                serverResult.packetLost ? 1 : 0,
                serverResult.time,
            ]);
        });

        const textResult = `${result.timestamp}: sent=${result.sent}, lost=${result.lost}. min=${result.minPing} avg=${result.averagePing}, max=${result.maxPing}`;
        if (result.averagePing > config.error_threshold) {
            logger.printColored(logger.RED, textResult);
        } else if (result.averagePing > config.warning_threshold) {
            logger.printColored(logger.YELLOW, textResult);
        } else {
            logger.print(textResult);
        }
    });
}

main();
