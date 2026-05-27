import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {     // req se jo bhi json data aata h woh mil jaata h. req se saara data configure ho jaata h except file data isheliye file ek alag field leni padti h, isheliye multer ka use krte h 
    cb(null, "./public/temp")
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

export const upload = multer({ storage })