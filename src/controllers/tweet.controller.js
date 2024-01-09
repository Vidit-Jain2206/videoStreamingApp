import mongoose, { isValidObjectId } from "mongoose";
import { TWEET } from "../models/tweet.model.js";
import { USER } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet

  const { content } = req.body;
  let user = await USER.findById({ _id: req.user?._id });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const tweet = await TWEET.create({
    content,
    owner: new mongoose.Types.ObjectId(req.user?._id),
  });

  const isTweetExist = await TWEET.findById(tweet._id).populate({
    path: "owner",
    select: "-password -refreshToken",
  });
  if (!isTweetExist) {
    throw new ApiError(400, "Tweet cannot be found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, isTweetExist, "Tweet Created Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "UserId is not valid");
  }
  let user = await USER.findById({ _id: userId });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const tweets = await TWEET.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
  ]);
  if (!tweets) {
    throw new ApiError(400, "Tweets cannot be found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "tweetId is not valid");
  }
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required to update");
  }

  const tweet = await TWEET.findByIdAndUpdate(
    tweetId,
    { content },
    { new: true }
  ).populate({
    path: "owner",
    select: "-password -refreshToken",
  });

  if (!tweet) {
    throw new ApiError(400, "Tweet is not updated");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet Updated Successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "tweetId is not valid");
  }

  const tweet = await TWEET.findByIdAndDelete(tweetId);
  if (!tweet) {
    throw new ApiError(400, "Tweet not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet Deleted Successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
