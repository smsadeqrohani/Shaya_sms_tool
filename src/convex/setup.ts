import { mutation } from "./_generated/server";

// Setup function to create the first user (for testing purposes)
export const setupFirstUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if any users exist
    const existingUsers = await ctx.db.query("users").collect();
    
    if (existingUsers.length > 0) {
      throw new Error("Users already exist");
    }

    // Create the first user
    const userId = await ctx.db.insert("users", {
      phoneNumber: "09127726273",
      password: "doosetdaram",
      name: "Test User",
      createdAt: Date.now(),
    });

    return userId;
  },
}); 