import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/lib/authSeller";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Address from "@/models/Address";
import Product from "@/models/Product";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            return NextResponse.json({ success: false, message: "User not authenticated" });
        }
        
        const isSeller = await authSeller(userId);
        if (!isSeller) {
            return NextResponse.json({ success: false, message: "Unauthorized" });
        }

        await connectDB();
        

        // Get orders first without population
        const orders = await Order.find({}).sort({ date: -1 });
    
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