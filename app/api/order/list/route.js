import connectDB from "@/config/db";
import Address from "@/models/Address";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            return NextResponse.json({ success: false, message: "User not authenticated" });
        }

        await connectDB();
        
        console.log("🔍 Fetching orders for user:", userId);
        
        // Get orders first
        const orders = await Order.find({ userId }).sort({ date: -1 });
        
        // Manually fetch address and product data for each order
        const ordersWithDetails = await Promise.all(
            orders.map(async (order) => {
                const orderObj = order.toObject();
                
                // Fetch address details
                if (orderObj.address) {
                    try {
                        const addressData = await Address.findById(orderObj.address);
                        orderObj.address = addressData;

                    } catch (err) {

                        orderObj.address = null;
                    }
                }
                
                // Fetch product details for each item
                if (orderObj.items && orderObj.items.length > 0) {
                    orderObj.items = await Promise.all(
                        orderObj.items.map(async (item) => {
                            try {
                                const productData = await Product.findById(item.product);
                                return {
                                    ...item,
                                    product: productData
                                };
                            } catch (err) {
                             
                                return {
                                    ...item,
                                    product: null
                                };
                            }
                        })
                    );
                }
                
                return orderObj;
            })
        );
        
        
        return NextResponse.json({ success: true, orders: ordersWithDetails });
        
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message });
    }
}