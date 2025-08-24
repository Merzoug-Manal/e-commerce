import connectDB from "@/config/db";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    
    console.log("Raw auth result:", { userId });
    
    if (!userId) {
      return NextResponse.json({
        success: false, 
        message: "Unauthorized - No user ID found"
      });
    }

    await connectDB();
    
    // Debug: Check what's in the database
    const allUsers = await User.find({}).limit(5);
    console.log("All users in database:", allUsers.map(u => ({ _id: u._id, name: u.name })));
    
    // Since you're using Clerk userId as _id, use findById
    const user = await User.findById(userId);
    
    console.log("Searching for user with ID:", userId);
    console.log("User found:", user);
    console.log("User ID type:", typeof userId);
    console.log("User ID length:", userId.length);

    if (!user) {
      return NextResponse.json({
        success: false, 
        message: `User not found with ID: ${userId}. Database has ${allUsers.length} users.`
      });
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error("Error in GET /api/user/data:", error);
    return NextResponse.json({
      success: false, 
      message: error.message
    });
  }
}