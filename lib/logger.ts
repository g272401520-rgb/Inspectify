/**
 * Sistema de logging condicional para producción
 * Solo muestra logs en desarrollo, silencioso en producción
 */

type LogLevel = "log" | "info" | "warn" | "error" | "debug"

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"

  private formatMessage(level: LogLevel, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}]`
  }

  log(...args: any[]) {
    if (this.isDevelopment) {
      console.log(this.formatMessage("log", ...args), ...args)
    }
  }

  info(...args: any[]) {
    if (this.isDevelopment) {
      console.info(this.formatMessage("info", ...args), ...args)
    }
  }

  warn(...args: any[]) {
    if (this.isDevelopment) {
      console.warn(this.formatMessage("warn", ...args), ...args)
    }
  }

  error(...args: any[]) {
    // Los errores siempre se muestran, incluso en producción
    console.error(this.formatMessage("error", ...args), ...args)
  }

  debug(...args: any[]) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("debug", ...args), ...args)
    }
  }

  // Método especial para v0 debugging
  v0(...args: any[]) {
    if (this.isDevelopment) {
      console.log("[v0]", ...args)
    }
  }
}

export const logger = new Logger()
