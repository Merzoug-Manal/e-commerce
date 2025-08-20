import User from "@/models/User";
import { Inngest } from "inngest";
import connectDB from "./db";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "e-commerce" });

// Inngest function to save user data to database
export const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
    },
    {
        event: 'clerk/user.created',
    },
    async ({ event }) => {
        try {
            console.log("🔄 Starting user creation process");
            console.log("📥 Event data received:", JSON.stringify(event.data, null, 2));

            // Add null/undefined checks
            const eventData = event.data || {};
            const { id, first_name, last_name, email_addresses, image_url } = eventData;

            // Validate required fields
            if (!id) {
                console.error("❌ Missing user ID");
                throw new Error("User ID is required");
            }

            if (!email_addresses || !email_addresses[0] || !email_addresses[0].email_address) {
                console.error("❌ Missing or invalid email addresses");
                throw new Error("Valid email address is required");
            }

            if (!image_url) {
                console.error("❌ Missing image URL");
                throw new Error("Image URL is required");
            }

            const userData = {
                _id: id,
                email: email_addresses[0].email_address,
                name: `${first_name || ""} ${last_name || ""}`.trim() || "Unknown User",
                imageUrl: image_url,
                cartItems: {} // Explicitly set default
            };

            console.log("📝 Prepared user data:", JSON.stringify(userData, null, 2));

            // Connect to database
            console.log("🔌 Connecting to database...");
            await connectDB();
            console.log("✅ Database connected successfully");

            // Check if user already exists
            const existingUser = await User.findById(id);
            if (existingUser) {
                console.log("ℹ️ User already exists, skipping creation");
                return { success: true, message: "User already exists", user: existingUser };
            }

            // Create the user
            console.log("👤 Creating new user...");
            const newUser = await User.create(userData);
            console.log("✅ User created successfully:", JSON.stringify(newUser.toObject(), null, 2));

            // Verify the user was saved
            const verifyUser = await User.findById(id);
            if (verifyUser) {
                console.log("✅ User verified in database");
                
                // Log collection stats
                const userCount = await User.countDocuments();
                console.log(`📊 Total users in collection: ${userCount}`);
                
                return { success: true, user: newUser };
            } else {
                console.error("❌ User creation verification failed");
                throw new Error("User was not saved to database");
            }

        } catch (error) {
            console.error("❌ Error in syncUserCreation:", error);
            console.error("❌ Error stack:", error.stack);
            
            // Handle duplicate key errors
            if (error.code === 11000) {
                console.log("ℹ️ Duplicate key error, user might already exist");
                try {
                    const existingUser = await User.findById(event.data?.id);
                    if (existingUser) {
                        return { success: true, message: "User already exists", user: existingUser };
                    }
                } catch (findError) {
                    console.error("❌ Error finding existing user:", findError);
                }
            }
            
            // Re-throw to let Inngest handle the retry
            throw error;
        }
    }
);

// Inngest function to update user data in database
export const syncUserUpdation = inngest.createFunction(
    {
        id: 'update-user-from-clerk',
    },
    {
        event: 'clerk/user.updated',
    },
    async ({ event }) => {
        try {
            console.log("🔄 Starting user update process");
            
            const eventData = event.data || {};
            const { id, first_name, last_name, email_addresses, image_url } = eventData;

            if (!id) {
                console.error("❌ Missing user ID for update");
                throw new Error("User ID is required for update");
            }

            // Build update data, only including defined values
            const userData = {};
            
            if (email_addresses && email_addresses[0] && email_addresses[0].email_address) {
                userData.email = email_addresses[0].email_address;
            }
            
            if (first_name !== undefined || last_name !== undefined) {
                userData.name = `${first_name || ""} ${last_name || ""}`.trim() || "Unknown User";
            }
            
            if (image_url) {
                userData.imageUrl = image_url;
            }

            console.log("📝 Update data:", JSON.stringify(userData, null, 2));

            await connectDB();
            
            const updatedUser = await User.findByIdAndUpdate(
                id, 
                userData, 
                { 
                    new: true,
                    runValidators: true
                }
            );

            if (!updatedUser) {
                console.error("❌ User not found for update:", id);
                throw new Error(`User with ID ${id} not found`);
            }

            console.log("✅ User updated successfully:", JSON.stringify(updatedUser.toObject(), null, 2));
            return { success: true, user: updatedUser };

        } catch (error) {
            console.error("❌ Error in syncUserUpdation:", error);
            throw error;
        }
    }
);

// Inngest function to delete user data from database
export const syncUserDeletion = inngest.createFunction(
    {
        id: 'delete-user-from-clerk',
    },
    {
        event: 'clerk/user.deleted',
    },
    async ({ event }) => {
        try {
            console.log("🔄 Starting user deletion process");
            
            const eventData = event.data || {};
            const { id } = eventData;

            if (!id) {
                console.error("❌ Missing user ID for deletion");
                throw new Error("User ID is required for deletion");
            }

            await connectDB();
            
            const deletedUser = await User.findByIdAndDelete(id);
            
            if (!deletedUser) {
                console.log("ℹ️ User not found for deletion (might already be deleted):", id);
                return { success: true, message: "User not found (might already be deleted)" };
            }

            console.log("✅ User deleted successfully:", JSON.stringify(deletedUser.toObject(), null, 2));
            
            // Log updated collection stats
            const userCount = await User.countDocuments();
            console.log(`📊 Remaining users in collection: ${userCount}`);
            
            return { success: true, deletedUser };

        } catch (error) {
            console.error("❌ Error in syncUserDeletion:", error);
            throw error;
        }
    }
);