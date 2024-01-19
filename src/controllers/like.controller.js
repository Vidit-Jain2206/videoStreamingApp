import mongoose, { isValidObjectId } from "mongoose";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { VIDEO } from "../models/video.model.js";
import { LIKE } from "../models/like.model.js";
import { COMMENT } from "../models/comment.model.js";
import { TWEET } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is not valid");
  }
  const video = await VIDEO.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video is not found");
  }
  const like = await LIKE.findOne({ video: videoId, likedBy: req.user?._id });
  if (!like) {
    //then create
    const newLike = await LIKE.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    if (!newLike) {
      throw new ApiError(400, "Video can not be liked");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Video Liked successfully"));
  }
  await LIKE.findByIdAndDelete(like._id);
  return res
    .status(200)
    .json(new ApiResponse(200, like, "Video Liked Successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "commentId is not valid");
  }
  const comment = await COMMENT.findById(commentId);
  if (!comment) {
    throw new ApiError(400, "comment is not found");
  }
  const like = await LIKE.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });
  if (!like) {
    //then create
    const newLike = await LIKE.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    if (!newLike) {
      throw new ApiError(400, "comment can not be liked");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "comment Liked successfully"));
  }
  await LIKE.findByIdAndDelete(like._id);
  return res
    .status(200)
    .json(new ApiResponse(200, like, "comment Liked Successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Tweet is not valid");
  }
  const Tweet = await TWEET.findById(tweetId);
  if (!Tweet) {
    throw new ApiError(400, "Tweet is not found");
  }
  const like = await LIKE.findOne({ tweet: tweetId, likedBy: req.user?._id });
  if (!like) {
    //then create
    const newLike = await LIKE.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });
    if (!newLike) {
      throw new ApiError(400, "Tweet can not be liked");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Tweet Liked successfully"));
  }
  await LIKE.findByIdAndDelete(like._id);
  return res
    .status(200)
    .json(new ApiResponse(200, like, "Tweet Liked Successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const likedVideos = await LIKE.aggregate([
    {
      $match: {
        $and: [
          { video: { $exists: true } },
          { likedBy: new mongoose.Types.ObjectId(req.user?._id) },
        ],
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $unset: ["password", "refreshToken"],
                },
              ],
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "likedBy",
        foreignField: "_id",
        as: "likedBy",
        pipeline: [
          {
            $unset: ["password", "refreshToken"],
          },
        ],
      },
    },
  ]);

  if (likedVideos) {
    throw new ApiError(400, "videos can not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Videos fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
