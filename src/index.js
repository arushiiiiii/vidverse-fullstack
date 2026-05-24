// require('dotenv').config({path: './env'})

import dotenv from "dotenv";      // direct import aise available nhi h dotenv mein, usme require krke he show hoga. toh ise aise use krne ke liye hume package mein scripts mein dev ke andar "-r dotenv/config --experimental-json-modules" yeh likhna hoga taaki saare environment variable load ho jaye. hume ek experimental feature use krna h isliye hum -r flag lga kr hum envirenment variable directly load kra skte h

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import connectDB from "./db/index.js";  // kabhi kabhi index file khud se nhi load hoti toh hume use likhna padta h

dotenv.config({path: './.env'})
connectDB()









/*

import express from "express";
const app = express()

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERR: ", error);
            throw error
        }) // here "on" is a listener and it can listen many events, we wrote error here kyunki iss case mein hum maan rhe hai ki humari express ki app hai woh iss case mein baat nhi kr paa rhi hai

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("ERROR: ", error)
        throw error
    }
})() // IFFE (Immediately Invoked Function Expression) is a JavaScript design pattern where a function runs as soon as it is defined.

 */