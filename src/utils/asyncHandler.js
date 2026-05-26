// promises
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err)) // next use kiya h taaki jisko bhi aage apna kaam krna ho kr le
    }
}

export {asyncHandler}



// asyncHandler yahan ek higher order function h i.e. yeh ek function accept bhi kr skta h as a variable and return bhi
// const asyncHandler = () => {}
// const asyncHandler = (func) => {() => {}}
// const asyncHandler = (func) => async () => {}

// try catch method

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }