import fs from "fs";

const logger = new console.Console(
    fs.createWriteStream("./logs/logs.log", { flags: "a" }),
    fs.createWriteStream("./logs/errors.log", { flags: "a" })
);

export function log(...args: any[]) {
    const date = `[${new Date().toISOString()}]`;
    console.log(date, ...args);
    logger.log(date, ...args);
}

export function error(...args: any[]) {
    const date = `[${new Date().toISOString()}]`;
    console.error(date, ...args);
    logger.error(date, ...args);
}

export function print(...args: any[]) {
    const date = `[${new Date().toISOString()}]`;
    console.log(date, ...args);
}

export const RED = "\x1b[31m";
export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
const CLEAR = "\x1b[0m";

export function printColored(color: typeof RED | typeof GREEN | typeof YELLOW, ...args: any[]) {
    const date = `${color}[${new Date().toISOString()}]`;
    console.error(date, ...args, CLEAR);
}
