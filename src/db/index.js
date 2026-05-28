import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {  //asynchronous method jb bhi complete hota h toh woh ek promise bhi return krta h
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("MONGODB connection error", error);
        process.exit(1);   // Nodejs hume process ka access deta h. jo humari current application chal rhi h woh kisi na kisi process pr chal rhi hoti h uska reference h
    }
}

export default connectDB