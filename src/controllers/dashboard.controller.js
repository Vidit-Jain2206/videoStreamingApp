import mongoose from "mongoose";
import { VIDEO } from "../models/video.model.js";
import { SUBSCRIPTION } from "../models/subscription.model.js";
import { LIKE } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { USER } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user?._id;

  //total subscribers
  const subscribers = await SUBSCRIPTION.find({ channel: userId });
  if (!subscribers) {
    throw new ApiError(400, "Subscribers not found");
  }

  //total Likes
  const likes = await LIKE.find({ likedBy: userId });
  if (!likes) {
    throw new ApiError(400, "No Likes");
  }

  //total videos
  const videos = await VIDEO.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: "$owner",
        totalViews: {
          $sum: "$views",
        },
        totalVideos: {
          $push: "$$ROOT",
        },
      },
    },
  ]);
  if (!(videos.length > 0)) {
    throw new ApiError(400, "No videos");
  }
  const totalLikes = likes.length;
  const totalSubscribers = subscribers.length;
  const totalvideos = videos[0].totalVideos;
  const totalViews = videos[0].totalViews;
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalLikes, totalSubscribers, totalViews, totalvideos },
        "Channel data fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const videos = await VIDEO.find({
    owner: userId,
  });
  if (!videos) {
    throw new ApiError(400, "Video can not be found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
