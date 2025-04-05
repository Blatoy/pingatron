import config from "./config";
import * as logger from "./logger";

const API_URL = "https://api.open-meteo.com/v1/forecast";
const API_PARMETERS = `latitude=${config.location.latitude}&longitude=${config.location.longitude}&current=temperature_2m,is_day,rain,relative_humidity_2m,precipitation,showers,snowfall,surface_pressure`;

export class Weather {
    private latestWeather = {
        time: "", // ISO8601
        temperature_2m: NaN, // °C
        is_day: NaN, // 0 or 1
        rain: NaN, // mm
        relative_humidity_2m: NaN, // %
        precipitation: NaN, // mm
        showers: NaN, // mm
        snowfall: NaN, // cm
        surface_pressure: NaN, // hPa
    };

    constructor() {
        setInterval(() => {
            this.refresh();
        }, config.refresh_weather_interval_minutes * 60 * 1000);
    }

    public get latest() {
        return this.latestWeather;
    }

    public async refresh() {
        if (!config.track_weather) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}?${API_PARMETERS}`);
            const data = await response.json();

            if (data && data.current) {
                this.latestWeather.time = data.current.time;
                this.latestWeather.temperature_2m = data.current.temperature_2m;
                this.latestWeather.is_day = data.current.is_day;
                this.latestWeather.rain = data.current.rain;
                this.latestWeather.relative_humidity_2m = data.current.relative_humidity_2m;
                this.latestWeather.precipitation = data.current.precipitation;
                this.latestWeather.showers = data.current.showers;
                this.latestWeather.snowfall = data.current.snowfall;
                this.latestWeather.surface_pressure = data.current.surface_pressure;
            } else {
                logger.error("Received invalid weather data: ", data);
            }

            logger.log("Refreshed weather: ", this.latestWeather);
        } catch (err) {
            logger.error("Failed to fetch weather data: ", err);
        }
    }
}
