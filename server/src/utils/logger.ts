import winston from 'winston';

const { combine, timestamp, printf, colorize, align } = winston.format;

const logFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }),
  align(),
  printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console()
  ],
});
