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
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    tag: v.string(),
    message: v.string(),
    totalNumbers: v.number(),
    totalBatches: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("scheduled"),
      v.literal("cancelled")
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    persianDate: v.string(), // Persian date string
    scheduledFor: v.optional(v.number()), // Unix timestamp for scheduled campaigns
    isScheduled: v.optional(v.boolean()), // Flag to identify scheduled campaigns
  }).index("by_tag", ["tag"]).index("by_created_at", ["createdAt"]).index("by_scheduled", ["scheduledFor"]),

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

  // Enhanced Segments table: stores 100-number batches per campaign with detailed logging
  segments: defineTable({
    campaignId: v.id("campaigns"),
    batchNumber: v.number(),
    numbers: v.array(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("paused")
    ),
    sentCount: v.number(),
    failedCount: v.number(),
    createdAt: v.number(),
    scheduledFor: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    
    // Enhanced logging fields (previously in a separate logs table)
    message: v.optional(v.string()), // The actual message sent
    tag: v.optional(v.string()), // The tag used for this batch
    
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
    sourceNumber: v.optional(v.string()), // The sender number
    destinationCount: v.optional(v.number()), // Number of destination numbers
    messageLength: v.optional(v.number()), // Length of the message
    
    // Timestamps
    sentAt: v.optional(v.number()),
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
    
    // Legacy API request/response fields (kept for backward compatibility)
    apiRequest: v.optional(v.string()),
    apiResponse: v.optional(v.string()),
  })
    .index("by_campaign", ["campaignId"]) 
    .index("by_campaign_status", ["campaignId", "status"]) 
    .index("by_scheduled", ["scheduledFor"])
    .index("by_sent_at", ["sentAt"]) // New index for reporting
    .index("by_campaign_sent_at", ["campaignId", "sentAt"]), // New index for campaign logs
}); 