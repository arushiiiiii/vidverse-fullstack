import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})    // jb hum save krate h toh mongoose wale model bhi kick in kr jaate h. jaise ki password required hoga phirse but humne toh sirf refreshToken diya h isliye hum {validateBeforeSave: false} use krte h
        
        return {accessToken, refreshToken};
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating token");
    }
}





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


const loginUser = asyncHandler(async (req, res) => {
    // Bring data from request body (req.body -> data)
    // username or email
    // find the user
    // password check
    // access and refresh token generation
    // send cookies

    const {email, username, password} = req.body;
    if (!(username || email)) {
        throw new ApiError(400, "username or email is required!")
    }
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // cookies
    const options = {
        httpOnly: true, 
        secure: true
    }  // cookies by default koi bhi modify kr skta h frontend pr, lekin yeh cheezein true krne se yeh sirf server se modifiable rehti h

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            } ,   // yeh cookies ke alawa alag se hum yahan(header ke through) isliye bhej rhe h for the case if user itself wants to save refreshToken, accessToken. maybe for saving in local storage or for developing mobile applications
            "User logged in successfully"
        )
    )
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {   // here we will use another mongodb operator
            $set: {
                refreshToken: undefined
            }  
        },
        {
            new: true //isse hume response mein nayi value mil jaayegi
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unautorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used.")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(401, "Invalid User")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changes successfully"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body
    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email // dono type se likh skte h, ek es5 ka feature ek es6
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200
        .json(new ApiResponse(200, user, "Account Details Updated Successfully"))
    )
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        { new: true }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar image updated successfully"))
})


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        { new: true }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"))
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const{username} = req.params    // jb bhi hume kisi channel ki profile chahiye hoti h toh hum uske url pr jaate h. Ab hume uske url milega req.params se na ki req.body se kyunki url ke andar hi username hoga. req.body se toh data tab milega jab frontend hume data bheje, lekin yaha toh frontend se data nahi aa raha h, hum url ke through hi username le rhe h
    if (!username?.trim()) {
        throw new ApiError(400, "username is required")
    }

    // User.findOne({username}); // yeh bhi use kr skte h
    // aggregate pipelines use krne se return value hume arrays milti h 
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",   // yeh wohi collection h jiska model humne subscription.model.js ke andar banaya h. mongodb collection ka naam plural form mein hota h, toh subscription ka plural form subscriptions ho jaayega
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"   // hum $ sign isliye use kr rhe h kyunki subscribers ek field hai, aur har field ke aage hume $ sign lagana hota h mongodb queries mein
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in : [req.user?._id, "$subscribers.subscriber"]},  // $in operator array aur objects ke andar check krta h ki kya given value exist krti h ya nahi. yaha hum check kr rhe h ki kya current logged in user ka id, subscribers array ke andar subscriber field ke andar exist krta h ya nahi. kyunki subscribers array ke andar saare subscribers ki details hoti h, aur har subscriber ke andar subscriber field hota h jisme subscriber ka id hota h.
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})


const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id), // here _id is the id of the user whose watch history we want to fetch, and req.user._id is the id of the currently logged in user. toh dono id ko compare krne ke liye hume unhe same format mein convert krna hoga, aur mongoose.Types.ObjectId() use krne se hum dono id ko object id format mein convert kr skte h
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {  // nested lookup, yeh basically videos ke andar owner ki details bhi fetch krne ke liye hoga
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    }, 
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"  // kyunki owner ke andar hume sirf ek hi user ki details milegi, toh $first operator use krke hum usi user ki details ko owner field ke andar daal denge, warna toh owner field ke andar ek array aa jaayega jisme us user ki details hongi
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully")
    )
})




export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar, 
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}