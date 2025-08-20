import User from "@/models/User";
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "e-commerce" });

// Create user
export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const data = event.data || {};  // ensure it's never undefined
    const { id, first_name, last_name, email_addresses = [], image_url } = data;

    if (!id) {
      console.error("❌ Missing user id in clerk/user.created event:", event);
      return;
    }

    const userData = {
      _id: id,
      email: email_addresses[0]?.email_address || "",
      name: `${first_name || ""} ${last_name || ""}`,
      imageUrl: image_url || "",
    };

    await connectDB();
    await User.create(userData);
  }
);

// Update user
export const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const data = event.data || {};
    const { id, first_name, last_name, email_addresses = [], image_url } = data;

    if (!id) {
      console.error("❌ Missing user id in clerk/user.updated event:", event);
      return;
    }

    const userData = {
      _id: id,
      email: email_addresses[0]?.email_address || "",
      name: `${first_name || ""} ${last_name || ""}`,
      imageUrl: image_url || "",
    };

    await connectDB();
    await User.findByIdAndUpdate(id, userData);
  }
);

// Delete user
export const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const data = event.data || {};
    const { id } = data;

    if (!id) {
      console.error("❌ Missing user id in clerk/user.deleted event:", event);
      return;
    }

    await connectDB();
    await User.findByIdAndDelete(id);
  }
);
