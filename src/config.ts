import fs from "fs";
import * as logger from "./logger";

if (!fs.existsSync("./config.json")) {
    logger.print("Creating config.json from config.default.json");
    fs.copyFileSync("./config.default.json", "./config.json");
}

const config: {
    track_weather: boolean;
    servers: string[];
    ping_timeout_seconds: number;
    ping_interval_seconds: number;
    ping_history_length_seconds: number;
    refresh_weather_interval_minutes: number;
    error_threshold: number;
    warning_threshold: number;
    startup_ignore_seconds: number;
    location: {
        latitude: number;
        longitude: number;
    };
    result_folder_path:  string;
} = JSON.parse(fs.readFileSync("./config.json", "utf8"));

export default config;
