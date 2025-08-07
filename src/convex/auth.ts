import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Sign up function
export const signUp = mutation({
  args: {
    phoneNumber: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existingUser) {
      throw new Error("User already exists with this phone number");
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      phoneNumber: args.phoneNumber,
      password: args.password,
      name: args.name,
      createdAt: Date.now(),
    });

    return {
      _id: userId,
      phoneNumber: args.phoneNumber,
      name: args.name,
    };
  },
});

// Login function
export const login = mutation({
  args: {
    phoneNumber: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.password !== args.password) {
      throw new Error("Invalid password");
    }

    // Update last login time
    await ctx.db.patch(user._id, {
      lastLogin: Date.now(),
    });

    return {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name || user.phoneNumber, // Fallback to phone number if name is not set
    };
  },
});

// Get user by phone number
export const getUserByPhone = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
  },
});

// Update user password
export const updateUserPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      password: args.newPassword,
    });
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      name: args.name,
    });
  },
}); 