var express = require("express");
const passport = require("passport");
var router = express.Router();
var Message = require("../models/message");
var User = require("../models/user");
const bcrypt = require("bcrypt");
var issueJWT = require("../utils/issueJWT");
const mongoose = require("mongoose");
const io = require("../socket");

router.get(
  "/:friendId",
  passport.authenticate("jwt", { session: false }),
  function (req, res, next) {
    let allMessages = [];
    User.findOne({ _id: mongoose.Types.ObjectId(req.params.friendId) })
      .exec()
      .then((result) => {
        if (result.blocked.map((el) => el.userId).includes(req.user._id)) {
          res.status(403).json({ error: "this user has blocked you" });
        } else if (
          !result.friends.map((el) => el.userId).includes(req.user._id)
        ) {
          res.status(403).json({ error: "this user is not your friend" });
        } else {
          Message.find({
            senderId: mongoose.Types.ObjectId(req.params.friendId),
            receiverId: req.user._id,
          })
            .exec()
            .then((result) => {
              allMessages.push(...result);
              return Message.find({
                senderId: req.user._id,
                receiverId: mongoose.Types.ObjectId(req.params.friendId),
              })
                .exec()
                .then((result) => {
                  allMessages.push(...result);
                  res.status(200).json({
                    messages: allMessages.sort((a, b) => {
                      if (a.timestamp < b.timestamp) {
                        return -1;
                      } else if (a.timestamp > b.timestamp) {
                        return 1;
                      } else {
                        return 0;
                      }
                    }),
                  });
                });
            });
        }
      })
      .catch((err) => {
        res.status(500).json({ error: err });
      });
  }
);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  function (req, res, next) {
    User.findOne({ _id: mongoose.Types.ObjectId(req.body.receiverId) })
      .exec()
      .then((result) => {
        if (result.blocked.map((el) => el.userId).includes(req.user._id)) {
          res.status(403).json({ error: "this user has blocked you" });
        } else if (
          !result.friends.map((el) => el.userId).includes(req.user._id)
        ) {
          res.status(403).json({ error: "this user is not your friend" });
        } else {
          let msg = new Message({
            _id: new mongoose.Types.ObjectId(),
            senderId: req.user._id,
            receiverId: mongoose.Types.ObjectId(req.body.receiverId),
            content: req.body.content,
            timestamp: new Date(),
          });
          msg.save().then((result) => {
            io.emit("message", msg);
            res.status(200).json({ message: "message sent successfully" });
          });
        }
      })
      .catch((err) => {
        res.status(500).json({ error: err });
      });
  }
);

module.exports = router;
