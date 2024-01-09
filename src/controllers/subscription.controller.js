import mongoose, { isValidObjectId } from "mongoose";
import { USER } from "../models/user.model.js";
import { SUBSCRIPTION } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "ChannelId is required");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "ChannelId is not valid");
  }
  const channel = await USER.findById(channelId);
  if (!channel) {
    throw new ApiError(400, "Channel does not exist");
  }

  // check whether current logged in user is already subscriber to channel or not

  const isSubscribed = await SUBSCRIPTION.find({
    subscriber: req.user?._id,
    channel: channelId,
  });
  if (isSubscribed) {
    // then unsubscribe it
    // delete the subscription
    const isSubscriptionDeleted = await SUBSCRIPTION.findByIdAndDelete(
      isSubscribed._id
    );
    if (!isSubscriptionDeleted) {
      throw new ApiError(500, "UnSubscription failed");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unsubcription is successfull"));
  }
  // subscribe to channel
  const subscribed = await SUBSCRIPTION.create({
    subscribed: req.user?._id,
    channel: channelId,
  })
    .populate({
      path: "subscriber",
      select: "-password -refreshToken",
    })
    .populate({
      path: "channel",
      select: "-password -refreshToken",
    });
  if (!subscribed) {
    throw new ApiError(500, "Subscription failed");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, subscribed, "Subcription is successfull"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "ChannelId is required");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "ChannelId is not valid");
  }
  const channel = await USER.findById(channelId);
  if (!channel) {
    throw new ApiError("400", "Channel is not found");
  }
  const subscribers = await SUBSCRIPTION.find({ channel: channelId })
    .populate({
      path: "subscriber",
      select: "-password -refreshToken",
    })
    .populate({
      path: "channel",
      select: "-password -refreshToken",
    });
  return res
    .status(200)
    .json(new ApiResponse(200, subscribers, "subscriber fetched successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) {
    throw new ApiError(400, "subscriberId is required");
  }
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "subscriberId is not valid");
  }
  const user = await USER.findById(subscriberId);
  if (!user) {
    throw new ApiError("400", "user is not found");
  }
  const subscribedChannels = await SUBSCRIPTION.find({
    subscribers: subscriberId,
  })
    .populate({
      path: "subscriber",
      select: "-password -refreshToken",
    })
    .populate({
      path: "channel",
      select: "-password -refreshToken",
    });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "subscriber fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
