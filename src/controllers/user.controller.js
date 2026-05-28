import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {



    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, check if avatar is uploaded successfully
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return res otherwise error
    


    const {fullname, email, username, password} = req.body
    // console.log(req.body)
    // console.log("email: ", email);

    // if (fullname === "") {
    //     throw new ApiError(400, "fullname is required")
    // } // similarly checking for each field

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")   // some method is similar to map but comparatively advanced
    ) {
        throw new ApiError(400, "All fields are required!")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]   // with the help of $ sign we can use many operators. Here since we need to check for more than one field therefore we have to use the or operator. Single field is written simply within the curly braces without any $ sign needed
    })   // findOne returns the very first user found with the same credentials
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    // we know that req.body ke andar humara saara data aata h lekin kyunki humne routes ke andar ek middleware add kr diya h toh ab hume yeh middleware bhi kuch files ka access deta h, yeh basically request ke andar aur fields add krta h.
    // ab jaise by default express hume req.body deta h, waise he multer hume req.files ka access deta h
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log(req.files)
    // console.log(avatarLocalPath)

    // const coverImageLocalPath = req.files?.coverImage[0]?.path; yeh directly error de skta h, javascript ka bug h yeh kyunki coverImage exist krta h ya nahi yeh cheez yeh check nhi krta
    let coverImageLocalPath;
    if (req.file && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path

    }




    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"  // by default saari fields selected hoti h, toh minus "-" lga kr jo field select kroge woh hat jaayegi.
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return res.status(201).json({createdUser}).  This also works fine
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export {registerUser}