import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for authentication
  users: defineTable({
    phoneNumber: v.string(),
    password: v.string(), // In production, this should be hashed
    name: v.optional(v.string()),
    createdAt: v.number(),
    lastLogin: v.optional(v.number()),
  }).index("by_phone", ["phoneNumber"]),

  // SMS Campaigns table
  campaigns: defineTable({
    tag: v.string(),
    message: v.string(),
    totalNumbers: v.number(),
    totalBatches: v.number(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("failed")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    persianDate: v.string(), // Persian date string
  }).index("by_tag", ["tag"]).index("by_created_at", ["createdAt"]),

  // SMS Logs table for detailed tracking
  smsLogs: defineTable({
    campaignId: v.id("campaigns"),
    batchNumber: v.number(),
    batchSize: v.number(),
    phoneNumbers: v.array(v.string()),
    message: v.string(), // The actual message sent
    tag: v.string(), // The tag used for this batch
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("partial_success")),
    
    // HTTP Response Details
    httpStatusCode: v.optional(v.number()),
    httpStatusText: v.optional(v.string()),
    
    // API Response Details
    apiStatusCode: v.optional(v.string()),
    apiMessage: v.optional(v.string()),
    apiStatus: v.optional(v.boolean()),
    apiResponseData: v.optional(v.string()), // Full API response as JSON string
    
    // Error Details
    errorMessage: v.optional(v.string()),
    errorType: v.optional(v.string()), // Network, API, Validation, etc.
    errorStack: v.optional(v.string()), // Full error stack trace
    
    // Performance Metrics
    responseTime: v.optional(v.number()), // Response time in milliseconds
    requestSize: v.optional(v.number()), // Size of request in bytes
    responseSize: v.optional(v.number()), // Size of response in bytes
    
    // Request Details
    sourceNumber: v.string(), // The sender number
    destinationCount: v.number(), // Number of destination numbers
    messageLength: v.number(), // Length of the message
    
    // Timestamps
    sentAt: v.number(),
    receivedAt: v.optional(v.number()), // When response was received
    
    // Additional Context
    retryCount: v.optional(v.number()), // Number of retries attempted
    userAgent: v.optional(v.string()), // User agent or client info
    ipAddress: v.optional(v.string()), // IP address if available
    
    // Detailed Results (for partial success)
    successfulNumbers: v.optional(v.array(v.string())), // Numbers that succeeded
    failedNumbers: v.optional(v.array(v.string())), // Numbers that failed
    individualResults: v.optional(v.array(v.object({
      phoneNumber: v.string(),
      status: v.union(v.literal("success"), v.literal("failed")),
      message: v.optional(v.string()),
      errorCode: v.optional(v.string()),
    }))),
  }).index("by_campaign", ["campaignId"]).index("by_sent_at", ["sentAt"]).index("by_status", ["status"]),

  // Campaign Statistics for quick reporting
  campaignStats: defineTable({
    campaignId: v.id("campaigns"),
    totalSent: v.number(),
    totalFailed: v.number(),
    totalSuccess: v.number(),
    totalPartialSuccess: v.number(), // New field for partial successes
    averageResponseTime: v.optional(v.number()),
    minResponseTime: v.optional(v.number()),
    maxResponseTime: v.optional(v.number()),
    totalResponseTime: v.optional(v.number()), // Sum of all response times
    requestCount: v.number(), // Number of API requests made
    lastUpdated: v.number(),
    lastError: v.optional(v.string()), // Last error message
    lastSuccessAt: v.optional(v.number()), // Timestamp of last success
    lastFailureAt: v.optional(v.number()), // Timestamp of last failure
  }).index("by_campaign", ["campaignId"]),
}); 