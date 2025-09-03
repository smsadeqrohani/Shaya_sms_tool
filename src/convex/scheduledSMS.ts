import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Scheduled function to send SMS at the specified time
export const sendScheduledSMS = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    phoneNumbers: v.array(v.string()),
    message: v.string(),
    tag: v.string(),
    batchNumber: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    console.log(`Executing scheduled SMS for campaign ${args.campaignId}, batch ${args.batchNumber}`);
    
    // Check if campaign exists and is not cancelled
    const campaign = await ctx.runQuery(internal.scheduledSMS.getCampaign, { campaignId: args.campaignId });
    if (!campaign) {
      console.log(`Campaign ${args.campaignId} not found, skipping scheduled SMS`);
      return { success: false, message: "Campaign not found" };
    }
    
    if (campaign.status === "cancelled") {
      console.log(`Campaign ${args.campaignId} has been cancelled, skipping scheduled SMS`);
      return { success: false, message: "Campaign has been cancelled" };
    }
    
    console.log(`Scheduled SMS would send to ${args.phoneNumbers.length} numbers:`, args.phoneNumbers);
    console.log(`Message: ${args.message}`);
    console.log(`Tag: ${args.tag}`);
    
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
      // Update campaign status to in progress
      await ctx.runMutation(internal.scheduledSMS.updateCampaignStatus, {
        campaignId: args.campaignId,
        status: "in_progress"
      });

      console.log(`Sending scheduled SMS batch ${args.batchNumber}: ${destinationCount} numbers`);
      
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
      
      console.log(`Scheduled SMS batch ${args.batchNumber} result:`, {
        status,
        responseTime,
        httpStatus: response.status,
        apiStatus: responseData.status,
        message: responseData.message
      });

      // Find and update the corresponding segment with detailed logging
      const segments = await ctx.runQuery(internal.scheduledSMS.getSegmentsByCampaignAndBatch, {
        campaignId: args.campaignId,
        batchNumber: args.batchNumber,
      });

      if (segments && segments.length > 0) {
        const segment = segments[0];
        await ctx.runMutation(internal.scheduledSMS.updateSegmentWithLogging, {
          segmentId: segment._id,
          status: status,
          sentCount: isSuccess ? destinationCount : 0,
          failedCount: isSuccess ? 0 : destinationCount,
          completedAt: Date.now(),
          lastError: isSuccess ? undefined : responseData.message,
          
          // Enhanced logging fields
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
          
          // Legacy fields for backward compatibility
          apiRequest: requestBody,
          apiResponse: responseText,
        });
      }

      // Update campaign stats
      await ctx.runMutation(internal.scheduledSMS.updateScheduledCampaignStats, {
        campaignId: args.campaignId,
        totalSent: destinationCount,
        totalSuccess: isSuccess ? destinationCount : 0,
        totalFailed: isSuccess ? 0 : destinationCount,
        totalPartialSuccess: 0,
        responseTime,
        errorMessage: isSuccess ? undefined : responseData.message,
        isSuccess,
      });

      // Update campaign status to completed
      await ctx.runMutation(internal.scheduledSMS.updateCampaignStatus, {
        campaignId: args.campaignId,
        status: "completed"
      });

      console.log(`Scheduled SMS completed for campaign ${args.campaignId}, batch ${args.batchNumber}`);
      
      return {
        success: isSuccess,
        responseData,
        responseTime,
        status,
        message: responseData.message,
        sentCount: destinationCount,
        successCount: isSuccess ? destinationCount : 0,
        failedCount: isSuccess ? 0 : destinationCount,
        campaignId: args.campaignId,
        batchNumber: args.batchNumber
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error(`Scheduled SMS failed for campaign ${args.campaignId}, batch ${args.batchNumber}:`, error);
      
      // Find and update the corresponding segment with error logging
      const segments = await ctx.runQuery(internal.scheduledSMS.getSegmentsByCampaignAndBatch, {
        campaignId: args.campaignId,
        batchNumber: args.batchNumber,
      });

      if (segments && segments.length > 0) {
        const segment = segments[0];
        await ctx.runMutation(internal.scheduledSMS.updateSegmentWithLogging, {
          segmentId: segment._id,
          status: "failed",
          sentCount: 0,
          failedCount: destinationCount,
          completedAt: Date.now(),
          lastError: errorMessage,
          
          // Enhanced logging fields
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
          
          // Legacy fields for backward compatibility
          apiRequest: requestBody,
          apiResponse: JSON.stringify({ error: errorMessage, stack: errorStack }),
        });
      }

      // Update campaign stats
      await ctx.runMutation(internal.scheduledSMS.updateScheduledCampaignStats, {
        campaignId: args.campaignId,
        totalSent: destinationCount,
        totalSuccess: 0,
        totalFailed: destinationCount,
        totalPartialSuccess: 0,
        responseTime,
        errorMessage,
        isSuccess: false,
      });

      // Update campaign status to failed
      await ctx.runMutation(internal.scheduledSMS.updateCampaignStatus, {
        campaignId: args.campaignId,
        status: "failed"
      });

      throw error;
    }
  },
});

// Helper mutation to update scheduled campaign stats
export const updateScheduledCampaignStats = internalMutation({
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

// Helper mutation to update campaign status
export const updateCampaignStatus = internalMutation({
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

// Helper query to get campaign
export const getCampaign = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

// Function to get scheduled functions for a campaign
export const getScheduledFunctionsForCampaign = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const scheduledFunctions = await ctx.db.system.query("_scheduled_functions")
      .filter((q) => 
        q.eq(q.field("args"), [{ campaignId: args.campaignId }])
      )
      .collect();
    
    return scheduledFunctions;
  },
}); 

// Helper to find segment by campaign and batch for scheduled runs
export const getSegmentsByCampaignAndBatch = internalQuery({
  args: {
    campaignId: v.id("campaigns"),
    batchNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("segments")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("batchNumber"), args.batchNumber))
      .collect();
  },
});

// Enhanced mutation to update segment with detailed logging
export const updateSegmentWithLogging = internalMutation({
  args: {
    segmentId: v.id("segments"),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("sent"), v.literal("failed"), v.literal("paused")),
    sentCount: v.number(),
    failedCount: v.number(),
    completedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    
    // Enhanced logging fields
    message: v.optional(v.string()),
    tag: v.optional(v.string()),
    httpStatusCode: v.optional(v.number()),
    httpStatusText: v.optional(v.string()),
    apiStatusCode: v.optional(v.string()),
    apiMessage: v.optional(v.string()),
    apiStatus: v.optional(v.boolean()),
    apiResponseData: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorType: v.optional(v.string()),
    errorStack: v.optional(v.string()),
    responseTime: v.optional(v.number()),
    requestSize: v.optional(v.number()),
    responseSize: v.optional(v.number()),
    sourceNumber: v.optional(v.string()),
    destinationCount: v.optional(v.number()),
    messageLength: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    retryCount: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    successfulNumbers: v.optional(v.array(v.string())),
    failedNumbers: v.optional(v.array(v.string())),
    individualResults: v.optional(v.array(v.object({
      phoneNumber: v.string(),
      status: v.union(v.literal("success"), v.literal("failed")),
      message: v.optional(v.string()),
      errorCode: v.optional(v.string()),
    }))),
    
    // Legacy fields
    apiRequest: v.optional(v.string()),
    apiResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
      sentCount: args.sentCount,
      failedCount: args.failedCount,
      completedAt: args.completedAt,
      lastError: args.lastError,
    };

    // Add enhanced logging fields if provided
    if (args.message !== undefined) updateData.message = args.message;
    if (args.tag !== undefined) updateData.tag = args.tag;
    if (args.httpStatusCode !== undefined) updateData.httpStatusCode = args.httpStatusCode;
    if (args.httpStatusText !== undefined) updateData.httpStatusText = args.httpStatusText;
    if (args.apiStatusCode !== undefined) updateData.apiStatusCode = args.apiStatusCode;
    if (args.apiMessage !== undefined) updateData.apiMessage = args.apiMessage;
    if (args.apiStatus !== undefined) updateData.apiStatus = args.apiStatus;
    if (args.apiResponseData !== undefined) updateData.apiResponseData = args.apiResponseData;
    if (args.errorMessage !== undefined) updateData.errorMessage = args.errorMessage;
    if (args.errorType !== undefined) updateData.errorType = args.errorType;
    if (args.errorStack !== undefined) updateData.errorStack = args.errorStack;
    if (args.responseTime !== undefined) updateData.responseTime = args.responseTime;
    if (args.requestSize !== undefined) updateData.requestSize = args.requestSize;
    if (args.responseSize !== undefined) updateData.responseSize = args.responseSize;
    if (args.sourceNumber !== undefined) updateData.sourceNumber = args.sourceNumber;
    if (args.destinationCount !== undefined) updateData.destinationCount = args.destinationCount;
    if (args.messageLength !== undefined) updateData.messageLength = args.messageLength;
    if (args.sentAt !== undefined) updateData.sentAt = args.sentAt;
    if (args.receivedAt !== undefined) updateData.receivedAt = args.receivedAt;
    if (args.retryCount !== undefined) updateData.retryCount = args.retryCount;
    if (args.userAgent !== undefined) updateData.userAgent = args.userAgent;
    if (args.ipAddress !== undefined) updateData.ipAddress = args.ipAddress;
    if (args.successfulNumbers !== undefined) updateData.successfulNumbers = args.successfulNumbers;
    if (args.failedNumbers !== undefined) updateData.failedNumbers = args.failedNumbers;
    if (args.individualResults !== undefined) updateData.individualResults = args.individualResults;
    
    // Legacy fields
    if (args.apiRequest !== undefined) updateData.apiRequest = args.apiRequest;
    if (args.apiResponse !== undefined) updateData.apiResponse = args.apiResponse;

    await ctx.db.patch(args.segmentId, updateData);
  },
});