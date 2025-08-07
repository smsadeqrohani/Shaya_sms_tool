import { api } from "./_generated/api";
import { action } from "./_generated/server";

// Initialize the database with any required setup
export const initializeDatabase = action({
  handler: async (ctx) => {
    console.log("Initializing database...");
    
    // Run migration to fix existing campaignStats documents
    try {
      const result = await ctx.runMutation(api.sms.migrateCampaignStats);
      console.log("Migration completed:", result);
    } catch (error) {
      console.error("Migration failed:", error);
    }
    
    return { status: "initialized" };
  },
}); 