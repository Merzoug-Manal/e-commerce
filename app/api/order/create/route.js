import { inngest } from "@/config/inngest";
import Product from "@/models/Product";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { address, items } = await request.json();


        if (!userId) {
            return NextResponse.json({ success: false, message: "User not authenticated" });
        }

        if (!address || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: "Invalid address or items" });
        }

        // Connect to database
        await connectDB();

        // Calculate total amount using for...of loop (handles async properly)
        let amount = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return NextResponse.json({ 
                    success: false, 
                    message: `Product not found: ${item.product}` 
                });
            }
            amount += product.offerPrice * item.quantity;
        }

        const finalAmount = amount + Math.floor(amount * 0.02);

     
        const eventResult = await inngest.send({
            name: 'order.created', 
            data: {
                userId,
                address,
                items,
                amount: finalAmount,
                date: Date.now(),
            }
        });


        // Clear user cart
        const user = await User.findById(userId);
        if (user) {
            user.cartItems = {};
            await user.save();
            console.log("🛒 User cart cleared");
        }

        return NextResponse.json({ success: true, message: "Order placed successfully" });
        
    } catch (error) {

        return NextResponse.json({ success: false, message: error.message });
    }
}