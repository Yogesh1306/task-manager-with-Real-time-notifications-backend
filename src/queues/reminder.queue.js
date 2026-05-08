import { Queue } from "bullmq"
import { redisClient } from "../config/redis.js"

export const reminderQueue = new Queue("task-reminders", {
  connection: redisClient
})