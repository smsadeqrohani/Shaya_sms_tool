import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
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
// Removed legacy logSMSAttempt. Logging is now done by updating the corresponding segment.

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
    console.log(`Sending SMS batch ${args.batchNumber}: ${args.phoneNumbers.length} numbers`);
    
    // Check if campaign exists and is not cancelled
    const campaign = await ctx.runQuery(api.sms.getCampaign, { campaignId: args.campaignId });
    if (!campaign) {
      console.log(`Campaign ${args.campaignId} not found, skipping SMS batch`);
      return { success: false, message: "Campaign not found" };
    }
    
    if (campaign.status === "cancelled") {
      console.log(`Campaign ${args.campaignId} has been cancelled, skipping SMS batch`);
      return { success: false, message: "Campaign has been cancelled" };
    }
    
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
      const status = isSuccess ? "sent" : "failed";
      
      console.log(`SMS batch ${args.batchNumber} result:`, {
        status,
        responseTime,
        httpStatus: response.status,
        apiStatus: responseData.status,
        message: responseData.message
      });

      // Update the corresponding segment with detailed information
      const segs = await ctx.runQuery(api.sms.getCampaignSegments, { campaignId: args.campaignId });
      const target = segs.find((s: any) => s.batchNumber === args.batchNumber);
      if (target) {
        await ctx.runMutation(internal.scheduledSMS.updateSegmentWithLogging, {
          segmentId: target._id,
          status,
          sentCount: isSuccess ? destinationCount : 0,
          failedCount: isSuccess ? 0 : destinationCount,
          completedAt: Date.now(),
          lastError: isSuccess ? undefined : responseData.message,
          message: args.message,
          tag: args.tag,
          httpStatusCode: response.status,
          httpStatusText: response.statusText,
          apiStatusCode: responseData.statusCode ? String(responseData.statusCode) : undefined,
          apiMessage: responseData.message,
          apiStatus: responseData.status,
          apiResponseData: JSON.stringify(responseData),
          errorMessage: isSuccess ? undefined : responseData.message,
          errorType: isSuccess ? undefined : 'API_ERROR',
          responseTime,
          requestSize,
          responseSize,
          sourceNumber,
          destinationCount,
          messageLength,
          sentAt: startTime,
          receivedAt: Date.now(),
          retryCount: 0,
          userAgent: 'FilmnetSMS-Tool/1.0',
          apiRequest: requestBody,
          apiResponse: responseText,
        });
      }

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

      return { success: isSuccess, responseData, responseTime, status, message: responseData.message };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error(`SMS batch ${args.batchNumber} error:`, error);
      
      // Update the corresponding segment with error information
      const segs = await ctx.runQuery(api.sms.getCampaignSegments, { campaignId: args.campaignId });
      const target = segs.find((s: any) => s.batchNumber === args.batchNumber);
      if (target) {
        await ctx.runMutation(internal.scheduledSMS.updateSegmentWithLogging, {
          segmentId: target._id,
          status: "failed",
          sentCount: 0,
          failedCount: destinationCount,
          completedAt: Date.now(),
          lastError: errorMessage,
          message: args.message,
          tag: args.tag,
          errorMessage,
          errorType: 'NETWORK_ERROR',
          errorStack,
          responseTime,
          requestSize,
          responseSize: 0,
          sourceNumber,
          destinationCount,
          messageLength,
          sentAt: startTime,
          receivedAt: Date.now(),
          retryCount: 0,
          userAgent: 'FilmnetSMS-Tool/1.0',
          apiRequest: requestBody,
          apiResponse: JSON.stringify({ error: errorMessage, stack: errorStack }),
        });
      }

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

      return { success: false, error: errorMessage, responseTime, status: "failed" };
    }
  },
});

// Update campaign status
export const updateCampaignStatus = mutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("scheduled"),
      v.literal("cancelled")
    ),
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

    // Note: Scheduled functions will be checked for cancellation status when they execute
    // This prevents them from running if the campaign is cancelled

    await ctx.db.patch(args.campaignId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return {
      message: "Campaign cancelled successfully. Scheduled functions will be checked for cancellation status when they execute."
    };
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
  args: { campaignId: v.id("campaigns"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    const segments = await ctx.db
      .query("segments")
      .withIndex("by_campaign_sent_at", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(limit);

    return segments.map((seg) => ({
      _id: seg._id,
      campaignId: seg.campaignId,
      batchNumber: seg.batchNumber,
      batchSize: seg.numbers.length,
      status: seg.status,
      responseTime: seg.responseTime,
      httpStatusCode: seg.httpStatusCode,
      apiMessage: seg.apiMessage,
      sentAt: seg.sentAt,
      errorMessage: seg.errorMessage,
      sentCount: seg.sentCount,
      failedCount: seg.failedCount,
    }));
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
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("paused")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("segments").withIndex("by_sent_at", (q) => q);
    
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
    
    return await ctx.db.query("segments")
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

// Legacy migration removed; all logging is now stored on segments.

export const createCampaignWithSegments = mutation({
  args: {
    name: v.optional(v.string()),
    tag: v.string(),
    message: v.string(),
    numbers: v.array(v.string()),
    createdBy: v.id("users"),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date());

    const isScheduled = Boolean(args.scheduledFor && args.scheduledFor > Date.now());

    // Handle empty arrays for large campaigns that will be added in chunks
    const totalNumbers = args.numbers.length;
    const batchSize = 100;
    const totalBatches = totalNumbers > 0 ? Math.ceil(totalNumbers / batchSize) : 0;

    const campaignId = await ctx.db.insert("campaigns", {
      name: args.name,
      tag: args.tag,
      message: args.message,
      totalNumbers,
      totalBatches,
      status: isScheduled ? "scheduled" : "pending",
      createdBy: args.createdBy,
      createdAt: Date.now(),
      persianDate,
      scheduledFor: args.scheduledFor || undefined,
      isScheduled,
    });

    await ctx.db.insert("campaignStats", {
      campaignId,
      totalSent: 0,
      totalFailed: 0,
      totalSuccess: 0,
      totalPartialSuccess: 0,
      requestCount: 0,
      lastUpdated: Date.now(),
    });

    // Only create segments if numbers are provided
    if (totalNumbers > 0) {
      for (let i = 0; i < totalBatches; i++) {
        const batchNumbers = args.numbers.slice(i * batchSize, (i + 1) * batchSize);
        await ctx.db.insert("segments", {
          campaignId,
          batchNumber: i + 1,
          numbers: batchNumbers,
          status: "pending",
          sentCount: 0,
          failedCount: 0,
          createdAt: Date.now(),
          scheduledFor: args.scheduledFor || undefined,
        });
      }
    }

    if (isScheduled && args.scheduledFor) {
      await ctx.scheduler.runAt(args.scheduledFor, api.sms.startCampaignJob, { campaignId });
    }

    return campaignId;
  }
});

export const getCampaignSegments = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("segments")
      .withIndex("by_campaign", (q: any) => q.eq("campaignId", args.campaignId))
      .order("asc")
      .collect();
  },
});

export const getCampaignSegmentsSummary = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const segments = await ctx.db
      .query("segments")
      .withIndex("by_campaign", (q: any) => q.eq("campaignId", args.campaignId))
      .order("asc")
      .collect();

    return segments.map((seg: any) => ({
      _id: seg._id,
      campaignId: seg.campaignId,
      batchNumber: seg.batchNumber,
      status: seg.status,
      sentCount: seg.sentCount,
      failedCount: seg.failedCount,
      createdAt: seg.createdAt,
      scheduledFor: seg.scheduledFor,
      startedAt: seg.startedAt,
      completedAt: seg.completedAt,
      lastError: seg.lastError,
      numbersCount: seg.numbers.length,
      // API metadata captured at send time
      httpStatusCode: seg.httpStatusCode,
      responseTime: seg.responseTime,
      requestSize: seg.requestSize,
      responseSize: seg.responseSize,
    }));
  },
});

async function sendBatch(ctx: any, numbers: string[], message: string, tag: string) {
  const sourceNumber = "981000007711";
  const requestData = {
    SourceNumber: sourceNumber,
    DestinationNumbers: numbers,
    Message: message,
    UserTag: tag
  };
  const requestBody = JSON.stringify(requestData);
  const startTime = Date.now();
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
  let responseData: any;
  try { responseData = JSON.parse(responseText); } catch { responseData = { status: false, message: 'Invalid JSON' }; }
  const isSuccess = response.ok && responseData.status === true;
  return { 
    isSuccess, 
    responseTime, 
    responseStatus: response.status, 
    responseData,
    requestBody,
    responseText,
    requestSize: new TextEncoder().encode(requestBody).length,
    responseSize: new TextEncoder().encode(responseText).length,
  };
}

// Helper: fetch pending segments for a campaign
export const getPendingSegments = query({
  args: { campaignId: v.id("campaigns"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("segments")
      .withIndex("by_campaign_status", (q: any) => q.eq("campaignId", args.campaignId).eq("status", "pending"))
      .order("asc")
      .take(limit);
  },
});

// Helper: mark a segment in progress
export const markSegmentInProgress = internalMutation({
  args: { segmentId: v.id("segments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.segmentId, { status: "in_progress", startedAt: Date.now(), lastError: undefined });
  },
});

// Helper: finalize a segment after send
export const finalizeSegment = internalMutation({
  args: {
    segmentId: v.id("segments"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    sentCount: v.number(),
    failedCount: v.number(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.segmentId, {
      status: args.status,
      completedAt: Date.now(),
      sentCount: args.sentCount,
      failedCount: args.failedCount,
      lastError: args.lastError,
    });
  },
});

// Helper: patch API payload and metrics onto a segment (actions cannot use ctx.db directly)
export const patchSegmentApiPayload = internalMutation({
  args: {
    segmentId: v.id("segments"),
    apiRequest: v.optional(v.string()),
    apiResponse: v.optional(v.string()),
    httpStatusCode: v.optional(v.number()),
    responseTime: v.optional(v.number()),
    requestSize: v.optional(v.number()),
    responseSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.segmentId, {
      apiRequest: args.apiRequest,
      apiResponse: args.apiResponse,
      httpStatusCode: args.httpStatusCode,
      responseTime: args.responseTime,
      requestSize: args.requestSize,
      responseSize: args.responseSize,
    });
  },
});

export const startCampaignJob = action({
  args: { campaignId: v.id("campaigns"), concurrentLimit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ status: "completed" | "in_progress" | "paused" }> => {
    const concurrentLimit = args.concurrentLimit ?? 3;

    // Mark campaign in progress
    await ctx.runMutation(api.sms.updateCampaignStatus, { campaignId: args.campaignId, status: "in_progress" });

    while (true) {
      // Respect pause/cancel on each cycle
      const current = await ctx.runQuery(api.sms.getCampaign, { campaignId: args.campaignId });
      if (!current) break;
      if (current.status === "cancelled") break;
      if (current.status === "paused") {
        return { status: "paused" };
      }

      const pendingSegments = await ctx.runQuery(api.sms.getPendingSegments, { campaignId: args.campaignId, limit: concurrentLimit });

      if (pendingSegments.length === 0) break;

      // Mark all selected segments as in progress
      await Promise.all(pendingSegments.map((seg: any) => ctx.runMutation(internal.sms.markSegmentInProgress, { segmentId: seg._id })));

      // Actually implement send and stats update
      await Promise.all(pendingSegments.map(async (seg: any) => {
        try {
          const campaign = await ctx.runQuery(api.sms.getCampaign, { campaignId: args.campaignId });
          if (!campaign) return;
          const { isSuccess, responseTime, responseStatus, responseData, requestBody, responseText, requestSize, responseSize } = await sendBatch(ctx, seg.numbers, campaign.message, campaign.tag);

          const sentCount = isSuccess ? seg.numbers.length : 0;
          const failedCount = isSuccess ? 0 : seg.numbers.length;

          await ctx.runMutation(internal.sms.finalizeSegment, {
            segmentId: seg._id,
            status: isSuccess ? "sent" : "failed",
            sentCount,
            failedCount,
            lastError: isSuccess ? undefined : (responseData.message || String(responseStatus)),
          });

          // Store compact API request/response on the segment itself via internal mutation
          await ctx.runMutation(internal.sms.patchSegmentApiPayload, {
            segmentId: seg._id,
            apiRequest: requestBody,
            apiResponse: responseText,
            httpStatusCode: responseStatus,
            responseTime,
            requestSize,
            responseSize,
          });

          await ctx.runMutation(api.sms.updateCampaignStats, {
            campaignId: args.campaignId,
            totalSent: seg.numbers.length,
            totalSuccess: sentCount,
            totalFailed: failedCount,
            totalPartialSuccess: 0,
            responseTime,
            errorMessage: isSuccess ? undefined : (responseData.message || String(responseStatus)),
            isSuccess,
          });
        } catch (error: any) {
          await ctx.runMutation(internal.sms.finalizeSegment, {
            segmentId: seg._id,
            status: "failed",
            sentCount: 0,
            failedCount: seg.numbers.length,
            lastError: error?.message || "Unknown error",
          });
          await ctx.runMutation(api.sms.updateCampaignStats, {
            campaignId: args.campaignId,
            totalSent: seg.numbers.length,
            totalSuccess: 0,
            totalFailed: seg.numbers.length,
            totalPartialSuccess: 0,
            responseTime: undefined,
            errorMessage: error?.message || "Unknown error",
            isSuccess: false,
          });
        }
      }));
    }

    // Determine final status
    const remaining = await ctx.runQuery(api.sms.getPendingSegments, { campaignId: args.campaignId, limit: 1 });

    await ctx.runMutation(api.sms.updateCampaignStatus, {
      campaignId: args.campaignId,
      status: remaining.length === 0 ? "completed" : "in_progress",
    });

    return { status: remaining.length === 0 ? "completed" : "in_progress" };
  },
});

// Pause campaign
export const pauseCampaign = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, { status: "paused" });
  },
});

// Resume campaign
export const resumeCampaign = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, { status: "in_progress" });
    return { ok: true };
  },
});

// Note: For scheduled runs, schedule a call to api.sms.startCampaignJob at the campaign's scheduled time.

// Add segment to existing campaign (for large datasets)
export const addSegmentToCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    batchNumber: v.number(),
    numbers: v.array(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.numbers || args.numbers.length === 0) {
      throw new Error("No phone numbers provided for segment");
    }

    // Remove duplicates and validate phone numbers
    const uniqueNumbers = [...new Set(args.numbers)];
    const validNumbers = uniqueNumbers.filter(num => {
      const cleanNum = num.toString().trim();
      return cleanNum.length >= 9 && !isNaN(Number(cleanNum));
    });

    if (validNumbers.length === 0) {
      throw new Error("No valid phone numbers found in segment");
    }

    // Check if campaign exists
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Create the segment
    const segmentId = await ctx.db.insert("segments", {
      campaignId: args.campaignId,
      batchNumber: args.batchNumber,
      numbers: validNumbers,
      status: "pending",
      sentCount: 0,
      failedCount: 0,
      createdAt: Date.now(),
      scheduledFor: args.scheduledFor || undefined,
    });

    // Update campaign stats
    const stats = await ctx.db
      .query("campaignStats")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        lastUpdated: Date.now(),
      });
    }

    return segmentId;
  },
});

 