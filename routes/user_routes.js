const userController = require("../users/users.controller");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("_helpers/db");
const User = db.User;

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/patient/image");
  },
  filename: (req, file, cb) => {
    let filename = file.originalname.split(".")[0];
    cb(null, filename + "-" + Date.now() + path.extname(file.originalname));
  }
});

let upload = multer({
  storage: storage,
  fileFilter: function(req, file, callback) {
    var ext = path.extname(file.originalname);
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
      req.fileValidationError = "Forbidden extension";
      return callback(null, false, req.fileValidationError);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 420 * 150 * 200
  }
});

// Register an User
router.post("/register", userController.register);

//Authenticate an User
router.post("/authenticate", userController.authenticate);

//Update Profile
router.post("/update", userController.updateProfile);

//Forget password route
router.post("/forgetpassword", userController.assignToken);

//Set password Route
router.post("/setpassword", userController.setPassword);

//get patient details
router.get("/getinfo/:id", userController.getProfileDetails);

router.post("/upload/image", upload.any(), (req, res, next) => {
  console.log("it came here");
  const file = req.files;
  console.log(file);
  const id = req.body.id;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }
  User.findOneAndUpdate(
    { _id: id },
    { $push: { picture: req.files[0].path } },
    { new: true }
  )
    .then(data => {
      res
        .status(200)
        .json({ status: true, message: "Image uploaded successfully", data });
    })
    .catch(error => {
      res.status(200).json({ status: false, message: error });
    });
  // res.send(file);
});

//Delete a Picture
router.post("/picture/delete", (req, res) => {
  let { id, query } = req.body;

  User.findOneAndUpdate(
    { _id: id },
    { $pull: { picture: query } },
    { new: true }
  )
    .then(data => {
      res
        .status(200)
        .json({ status: true, message: "Image deleted successfully", data });
    })
    .catch(error => {
      res.status(200).json({ status: false, message: error });
    });
});

router.post("/attempt", userController.attemptQuiz);

//Upload records

let recordsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/patient/records");
  },
  filename: (req, file, cb) => {
    let filename = file.originalname.split(".")[0];
    cb(null, filename + "-" + Date.now() + path.extname(file.originalname));
  }
});

let recordsUpload = multer({
  storage: recordsStorage,
  fileFilter: function(req, file, callback) {
    var ext = path.extname(file.originalname);
    if (ext !== ".pdf") {
      req.fileValidationError = "Please upload file in PDF format";
      return callback(null, false, req.fileValidationError);
    }
    callback(null, true);
  }
  // limits: {
  // 	fileSize: 420 * 150 * 200,
  // },
});

router.post("/upload/records", recordsUpload.any(), (req, res) => {
  if (req.files.length > 0) {
    let { id } = req.body;
    let data = {
      document: req.body.document,
      path: req.files[0].path,
      Date: Date.now(),
      description: req.body.description || "NA"
    };

    User.findOneAndUpdate(
      { _id: id },
      { $push: { records: data } },
      { new: true }
    )
      .then(data => {
        res
          .status(200)
          .json({ status: true, message: "Successfully added record", data });
      })
      .catch(error => {
        res.status(500).json({ status: false, message: error });
      });
  } else {
    res.status(500).json({ status: false, message: "Please select a file" });
  }
});
// exporting them
module.exports = router;
