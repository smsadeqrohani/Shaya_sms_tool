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
      const status = isSuccess ? "success" : "failed";
      
      console.log(`Scheduled SMS batch ${args.batchNumber} result:`, {
        status,
        responseTime,
        httpStatus: response.status,
        apiStatus: responseData.status,
        message: responseData.message
      });

      // Log the SMS attempt with detailed information
      const logId = await ctx.runMutation(internal.scheduledSMS.logScheduledSMSAttempt, {
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
        userAgent: 'ShayaSMS-Tool-Scheduled/1.0',
      });

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
        logId,
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
      
      // Log the error with detailed information
      const logId = await ctx.runMutation(internal.scheduledSMS.logScheduledSMSAttempt, {
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
        userAgent: 'ShayaSMS-Tool-Scheduled/1.0',
      });

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

// Helper mutation to log scheduled SMS attempts
export const logScheduledSMSAttempt = internalMutation({
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