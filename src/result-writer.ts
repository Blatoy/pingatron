import config from "./config";
import fs from "fs";
import * as logger from "./logger";

export class ResultWriter {
    private writeStream: fs.WriteStream | null = null;
    private dayNumber: number = new Date().getDate();

    constructor(private folderName: string, private csvHeader: string[]) {
        this.folderName = this.sanitizeFileName(folderName);
        this.createFolder();
        this.createWriteStream();
    }

    /**
     * Closes the write stream and creates a new one for the next day
     */
    private checkDayChanged() {
        const currentDayNumber = new Date().getDate();

        if (currentDayNumber !== this.dayNumber) {
            this.dayNumber = currentDayNumber;
            this.writeStream?.end();
            this.createWriteStream();
        }
    }

    /**
     * Create the folder for the results if it doesn't exist
     */
    private createFolder() {
        if (!fs.existsSync(this.folderName)) {
            fs.mkdirSync(`${config.result_folder_path}/${this.folderName}`, { recursive: true });
        }
    }

    /**
     * Create the write stream for the results, using the current date as the file name
     */
    private createWriteStream() {
        const date = new Date();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const path = `${config.result_folder_path}/${this.folderName}/${dateString}.csv`;

        const fileExists = fs.existsSync(path);
        this.writeStream = fs.createWriteStream(path, { flags: "a" });

        // Append the csv header if the file did not exist
        if (!fileExists) {
            this.writeStream.write(this.csvHeader.join(",") + "\n");
        }
    }

    private sanitizeFileName(fileName: string) {
        return fileName.replace(/[^a-zA-Z0-9]/g, "_");
    }

    /**
     * Append a new entry to the csv file
     * @param data The data to append to the csv file
     */
    appendCSVEntry(data: (number | string)[]) {
        this.checkDayChanged();

        if (this.writeStream) {
            this.writeStream.write(data.join(",") + "\n");
        } else {
            logger.error("Write stream is not initialized.");
        }
    }
}
