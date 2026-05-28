import {v2 as cloudinary} from "cloudinary"
import fs from "fs"        // fs aka fileSystem is an inbuilt library in nodejs i.e. we don't have to install it. it helps with read, write, remove etc in a file. we can get the file path from here. Here we mainly need "unlink"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // file has been uploaded successfully
        console.log("file is uploaded on cloudinary", response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed. sync because it must happen
        return null;
    }
}

export { uploadOnCloudinary } 