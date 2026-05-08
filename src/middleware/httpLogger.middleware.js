import pinoHttp from "pino-http"
import { logger } from "../config/logger.js"

export const httpLogger = pinoHttp({
  logger,

  customProps: (req) => ({
    userId: req.user?._id || null
  }),

  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error"
    if (res.statusCode >= 400) return "warn"
    return "info"
  }
})