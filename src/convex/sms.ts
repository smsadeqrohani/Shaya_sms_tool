import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Create a new SMS campaign
export const createCampaign = mutation({
  args: {
    tag: v.string(),
    message: v.string(),
    totalNumbers: v.number(),
    totalBatches: v.number(),
    createdBy: v.id("users"),
    scheduledFor: v.optional(v.number()), // Unix timestamp for scheduled campaigns
    phoneNumbers: v.optional(v.array(v.string())), // Store phone numbers for scheduled campaigns
  },
  handler: async (ctx, args) => {
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    const isScheduled = Boolean(args.scheduledFor && args.scheduledFor > Date.now());
    const status = isScheduled ? "scheduled" : "pending";

    const campaignId = await ctx.db.insert("campaigns", {
      tag: args.tag,
      message: args.message,
      totalNumbers: args.totalNumbers,
      totalBatches: args.totalBatches,
      status,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      persianDate,
      scheduledFor: args.scheduledFor || undefined,
      isScheduled,
    });

    // Initialize campaign stats with enhanced fields
    await ctx.db.insert("campaignStats", {
      campaignId,
      totalSent: 0,
      totalFailed: 0,
      totalSuccess: 0,
      totalPartialSuccess: 0,
      requestCount: 0,
      lastUpdated: Date.now(),
    });

    // If this is a scheduled campaign, schedule the SMS sending
    if (isScheduled && args.phoneNumbers) {
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < args.phoneNumbers.length; i += batchSize) {
        batches.push(args.phoneNumbers.slice(i, i + batchSize));
      }

      // Schedule each batch to run at the specified time
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (args.scheduledFor) {
          // Schedule the SMS sending using Convex's built-in scheduler
          await ctx.scheduler.runAt(args.scheduledFor, internal.scheduledSMS.sendScheduledSMS, {
            campaignId,
            phoneNumbers: batch,
            message: args.message,
            tag: args.tag,
            batchNumber: i + 1,
          });
        }
      }
    }

    return campaignId;
  },
});

// Enhanced mutation to log SMS attempt with detailed information
export const logSMSAttempt = mutation({
  args: {
    campaignId: v.id("campaigns"),
    batchNumber: v.number(),
    phoneNumbers: v.array(v.string()),
    message: v.string(),
    tag: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("partial_success")),
    
    // HTTP Response Details
    httpStatusCode: v.optional(v.number()),
    httpStatusText: v.optional(v.string()),
    
    // API Response Details
    apiStatusCode: v.optional(v.string()),
    apiMessage: v.optional(v.string()),
    apiStatus: v.optional(v.boolean()),
    apiResponseData: v.optional(v.string()),
    
    // Error Details
    errorMessage: v.optional(v.string()),
    errorType: v.optional(v.string()),
    errorStack: v.optional(v.string()),
    
    // Performance Metrics
    responseTime: v.optional(v.number()),
    requestSize: v.optional(v.number()),
    responseSize: v.optional(v.number()),
    
    // Request Details
    sourceNumber: v.string(),
    destinationCount: v.number(),
    messageLength: v.number(),
    
    // Timestamps
    sentAt: v.number(),
    receivedAt: v.optional(v.number()),
    
    // Additional Context
    retryCount: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    
    // Detailed Results
    successfulNumbers: v.optional(v.array(v.string())),
    failedNumbers: v.optional(v.array(v.string())),
    individualResults: v.optional(v.array(v.object({
      phoneNumber: v.string(),
      status: v.union(v.literal("success"), v.literal("failed")),
      message: v.optional(v.string()),
      errorCode: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("smsLogs", {
      campaignId: args.campaignId,
      batchNumber: args.batchNumber,
      batchSize: args.phoneNumbers.length,
      phoneNumbers: args.phoneNumbers,
      message: args.message,
      tag: args.tag,
      status: args.status,
      
      // HTTP Response Details
      httpStatusCode: args.httpStatusCode,
      httpStatusText: args.httpStatusText,
      
      // API Response Details
      apiStatusCode: args.apiStatusCode,
      apiMessage: args.apiMessage,
      apiStatus: args.apiStatus,
      apiResponseData: args.apiResponseData,
      
      // Error Details
      errorMessage: args.errorMessage,
      errorType: args.errorType,
      errorStack: args.errorStack,
      
      // Performance Metrics
      responseTime: args.responseTime,
      requestSize: args.requestSize,
      responseSize: args.responseSize,
      
      // Request Details
      sourceNumber: args.sourceNumber,
      destinationCount: args.destinationCount,
      messageLength: args.messageLength,
      
      // Timestamps
      sentAt: args.sentAt,
      receivedAt: args.receivedAt,
      
      // Additional Context
      retryCount: args.retryCount,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      
      // Detailed Results
      successfulNumbers: args.successfulNumbers,
      failedNumbers: args.failedNumbers,
      individualResults: args.individualResults,
    });
  },
});

// Enhanced mutation to update campaign stats with detailed metrics
export const updateCampaignStats = mutation({
  args: {
    campaignId: v.id("campaigns"),
    totalSent: v.number(),
    totalSuccess: v.number(),
    totalFailed: v.number(),
    totalPartialSuccess: v.number(),
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    isSuccess: v.boolean(),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("campaignStats")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();

    if (stats) {
      const newTotalSent = stats.totalSent + args.totalSent;
      const newTotalSuccess = stats.totalSuccess + args.totalSuccess;
      const newTotalFailed = stats.totalFailed + args.totalFailed;
      const newTotalPartialSuccess = stats.totalPartialSuccess + args.totalPartialSuccess;
      const newRequestCount = stats.requestCount + 1;
      
      // Calculate response time statistics
      let newAverageResponseTime = stats.averageResponseTime;
      let newMinResponseTime = stats.minResponseTime;
      let newMaxResponseTime = stats.maxResponseTime;
      let newTotalResponseTime = stats.totalResponseTime || 0;
      
      if (args.responseTime) {
        newTotalResponseTime += args.responseTime;
        newAverageResponseTime = newTotalResponseTime / newRequestCount;
        
        if (!newMinResponseTime || args.responseTime < newMinResponseTime) {
          newMinResponseTime = args.responseTime;
        }
        
        if (!newMaxResponseTime || args.responseTime > newMaxResponseTime) {
          newMaxResponseTime = args.responseTime;
        }
      }

      await ctx.db.patch(stats._id, {
        totalSent: newTotalSent,
        totalSuccess: newTotalSuccess,
        totalFailed: newTotalFailed,
        totalPartialSuccess: newTotalPartialSuccess,
        requestCount: newRequestCount,
        averageResponseTime: newAverageResponseTime,
        minResponseTime: newMinResponseTime,
        maxResponseTime: newMaxResponseTime,
        totalResponseTime: newTotalResponseTime,
        lastUpdated: Date.now(),
        lastError: args.isSuccess ? stats.lastError : args.errorMessage,
        lastSuccessAt: args.isSuccess ? Date.now() : stats.lastSuccessAt,
        lastFailureAt: args.isSuccess ? stats.lastFailureAt : Date.now(),
      });
    }
  },
});

// Enhanced SMS batch sending with detailed logging
export const sendSMSBatch = action({
  args: {
    campaignId: v.id("campaigns"),
    batchNumber: v.number(),
    phoneNumbers: v.array(v.string()),
    message: v.string(),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const sourceNumber = "981000007711";
    const messageLength = args.message.length;
    const destinationCount = args.phoneNumbers.length;
    
    // Prepare request data
    const requestData = {
      SourceNumber: sourceNumber,
      DestinationNumbers: args.phoneNumbers,
      Message: args.message,
      UserTag: args.tag
    };
    
    const requestBody = JSON.stringify(requestData);
    const requestSize = new TextEncoder().encode(requestBody).length;
    
    try {
      console.log(`Sending SMS batch ${args.batchNumber}: ${destinationCount} numbers`);
      
      // Call OkitSMS API
      const response = await fetch('https://api.okitsms.com/api/v1/sms/send/1tn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': 'CV@%OR!pM4p!jGp5j&kBFBYmAtEh#%Sr'
        },
        body: requestBody
      });

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();
      const responseSize = new TextEncoder().encode(responseText).length;
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        responseData = { error: 'Invalid JSON response', rawResponse: responseText };
      }

      const isSuccess = response.ok && responseData.status === true;
      const status = isSuccess ? "success" : "failed";
      
      console.log(`SMS batch ${args.batchNumber} result:`, {
        status,
        responseTime,
        httpStatus: response.status,
        apiStatus: responseData.status,
        message: responseData.message
      });

      // Log the SMS attempt with detailed information
      const logId: any = await ctx.runMutation(api.sms.logSMSAttempt, {
        campaignId: args.campaignId,
        batchNumber: args.batchNumber,
        phoneNumbers: args.phoneNumbers,
        message: args.message,
        tag: args.tag,
        status,
        
        // HTTP Response Details
        httpStatusCode: response.status,
        httpStatusText: response.statusText,
        
        // API Response Details
        apiStatusCode: responseData.statusCode ? String(responseData.statusCode) : undefined,
        apiMessage: responseData.message,
        apiStatus: responseData.status,
        apiResponseData: JSON.stringify(responseData),
        
        // Error Details
        errorMessage: isSuccess ? undefined : responseData.message,
        errorType: isSuccess ? undefined : 'API_ERROR',
        
        // Performance Metrics
        responseTime,
        requestSize,
        responseSize,
        
        // Request Details
        sourceNumber,
        destinationCount,
        messageLength,
        
        // Timestamps
        sentAt: startTime,
        receivedAt: Date.now(),
        
        // Additional Context
        retryCount: 0,
        userAgent: 'ShayaSMS-Tool/1.0',
      });

      // Update campaign stats
      await ctx.runMutation(api.sms.updateCampaignStats, {
        campaignId: args.campaignId,
        totalSent: destinationCount,
        totalSuccess: isSuccess ? destinationCount : 0,
        totalFailed: isSuccess ? 0 : destinationCount,
        totalPartialSuccess: 0,
        responseTime,
        errorMessage: isSuccess ? undefined : responseData.message,
        isSuccess,
      });

      return {
        success: isSuccess,
        logId,
        responseData,
        responseTime,
        status,
        message: responseData.message,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error(`SMS batch ${args.batchNumber} error:`, error);
      
      // Log the error with detailed information
      const logId: any = await ctx.runMutation(api.sms.logSMSAttempt, {
        campaignId: args.campaignId,
        batchNumber: args.batchNumber,
        phoneNumbers: args.phoneNumbers,
        message: args.message,
        tag: args.tag,
        status: "failed",
        
        // Error Details
        errorMessage,
        errorType: 'NETWORK_ERROR',
        errorStack,
        
        // Performance Metrics
        responseTime,
        requestSize,
        responseSize: 0,
        
        // Request Details
        sourceNumber,
        destinationCount,
        messageLength,
        
        // Timestamps
        sentAt: startTime,
        receivedAt: Date.now(),
        
        // Additional Context
        retryCount: 0,
        userAgent: 'ShayaSMS-Tool/1.0',
      });

      // Update campaign stats
      await ctx.runMutation(api.sms.updateCampaignStats, {
        campaignId: args.campaignId,
        totalSent: destinationCount,
        totalSuccess: 0,
        totalFailed: destinationCount,
        totalPartialSuccess: 0,
        responseTime,
        errorMessage,
        isSuccess: false,
      });

      return {
        success: false,
        logId,
        error: errorMessage,
        responseTime,
        status: "failed",
      };
    }
  },
});

// Update campaign status
export const updateCampaignStatus = mutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("failed"), v.literal("scheduled"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const updateData: any = { status: args.status };
    
    if (args.status === "completed" || args.status === "failed") {
      updateData.completedAt = Date.now();
    }

    await ctx.db.patch(args.campaignId, updateData);
  },
});

// Cancel campaign (for both ongoing and scheduled campaigns)
export const cancelCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Only allow cancellation of pending, scheduled, or in_progress campaigns
    if (campaign.status === "completed" || campaign.status === "failed" || campaign.status === "cancelled") {
      throw new Error("Cannot cancel completed, failed, or already cancelled campaigns");
    }

    await ctx.db.patch(args.campaignId, {
      status: "cancelled",
      completedAt: Date.now(),
    });
  },
});

// Get campaign by ID
export const getCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

// Get all campaigns
export const getAllCampaigns = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_created_at", (q) => q)
      .order("desc")
      .collect();
  },
});

// Get campaign logs
export const getCampaignLogs = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsLogs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .collect();
  },
});

// Get campaign stats
export const getCampaignStats = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaignStats")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
  },
});

// Get all campaign stats for reporting
export const getAllCampaignStats = query({
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").collect();
    const stats = await ctx.db.query("campaignStats").collect();
    
    return campaigns.map(campaign => {
      const campaignStats = stats.find(stat => stat.campaignId === campaign._id);
      return {
        ...campaign,
        stats: campaignStats,
      };
    });
  },
});

// Get scheduled campaigns that are ready to be sent
export const getScheduledCampaigns = query({
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("campaigns")
      .withIndex("by_scheduled", (q) => 
        q.gte("scheduledFor", 0).lte("scheduledFor", now)
      )
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();
  },
});

// Get scheduled functions for a campaign
export const getScheduledFunctions = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.system.query("_scheduled_functions")
      .filter((q) => 
        q.eq(q.field("args"), [{ campaignId: args.campaignId }])
      )
      .collect();
  },
});

// Get all batch logs across all campaigns
export const getAllBatchLogs = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("partial_success"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("smsLogs").withIndex("by_sent_at", (q) => q);
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.limit) {
      return await query.order("desc").take(args.limit);
    }
    
    return await query.order("desc").collect();
  },
});

// Get recent batch logs for dashboard
export const getRecentBatchLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    return await ctx.db.query("smsLogs")
      .withIndex("by_sent_at", (q) => q)
      .order("desc")
      .take(limit);
  },
});

// Migration function to fix existing campaignStats documents missing requestCount
export const migrateCampaignStats = mutation({
  handler: async (ctx) => {
    const allStats = await ctx.db.query("campaignStats").collect();
    
    for (const stat of allStats) {
      if (stat.requestCount === undefined) {
        await ctx.db.patch(stat._id, {
          requestCount: 0, // Set default value for existing documents
        });
      }
    }
    
    return { migrated: allStats.length };
  },
});

 