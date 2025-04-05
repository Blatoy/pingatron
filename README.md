# Pingatron

A simple tool to troubleshoot and monitor late and lost packets.

**Important:** This project uses https://open-meteo.com/ which is only free for non-commercial use.

## Features

-   Ping multiple servers and aggregate the results
-   Log results to csv files for further processing
-   Log weather information along ping results

## Installation

-   Install NodeJS (tested on v22.14.0)
-   Clone the project
-   Go into the folder and run `npm install`

## Config

-   Copy `config.default.json` to `config.json`
    -   `servers`: Array of hosts that will be pinged. **Important**: make sure to only ping servers you are allowed to.
    -   `ping_timeout_seconds`: Maximum waiting time for a ping to be considered as lost
    -   `ping_interval_seconds`: Interval at which all servers will be pinged
    -   `refresh_weather_interval_minutes`: How often to refresh weather info (the API only refreshes the data once every 15 minutes)
    -   `warning_threshold`: Min threshold to show pings in yellow in the console
    -   `error_threshold`: Min threshold to show pings in red in the console
    -   `track_weather`: Set to true to query weather data from the weather API. Also
    -   `location.latitude`: Latitude of the location for the weather data
    -   `location.longitude`: Longitude of the location for the weather data
    -   `result_folder_path`: Where to store folders

## Running

-   Run with `npm start`
-   The console will print live ping results
-   Detailed data is logged inside the results folder
    -   The `all` folder contains the aggregated data
    -   The other folders contain the data for each server separately
