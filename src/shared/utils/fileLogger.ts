import winston from "winston";
const vscodeFileLogsLevel: string[] = ["info", "error"];
const vscodeLogsPath: string = 'logs/vscode-logs';

function createFileLogger(logPath: string): winston.Logger {
  const logFileName: string = new Date().toISOString().split(':').join('.');
  const transports: winston.transports.FileTransportInstance[] = 
    vscodeFileLogsLevel
    .map((level: string) => new winston.transports.File({
        filename: `${logPath}/${vscodeLogsPath}/${logFileName}${level === "error" ? "-error" : ""}.log`,
        level: level, 
        format: winston.format.combine(
            winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
            winston.format.simple(),
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
      }));
  return winston.createLogger({transports});
}

export type FileLogger = winston.Logger;
export const fileLogger = {
  createFileLogger
};