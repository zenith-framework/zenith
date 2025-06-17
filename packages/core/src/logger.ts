import winston from "winston";

const logFormat = winston.format.printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

export const zenithLogger = (label: string) => winston.createLogger({
  level: process.env.DEBUG ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.label({ label }),
    winston.format.colorize(),
    logFormat,
  ),
  transports: [
    new winston.transports.Console()
  ]
});