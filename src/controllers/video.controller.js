import mongoose, { isValidObjectId } from "mongoose";
import { VIDEO } from "../models/video.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  //first we have to create query on which we have to filtered out our search
  //1. userId - fetch all videos by userId - that are created by owner(user)
  //2. filter it by query - just like search bar on youtube
  //3. now we have apply our pipelines to get filtered videos
  //4. return the filtered videos on the basis of sort page and limit

  //1.
  let pipeline = [];
  if (userId) {
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  //2.
  if (query) {
    let searchQuery = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };
    pipeline.push({
      $match: searchQuery,
    });
  }

  //this is the pipeline to join owner to users document and then selecting particular fields of users
  pipeline.push({
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
  });

  //3.
  const videoAggregate = VIDEO.aggregate(pipeline);

  //4.
  const videos = await VIDEO.aggregatePaginate(videoAggregate, {
    page: page,
    limit: limit,
    sort: {
      createdAt: sortType === "desc" ? -1 : 1,
    },
  });

  if (videos.docs.length === 0) {
    return res.status(400).json(new ApiError(400, "No more videos"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched Successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!title || !description) {
    throw new ApiError(401, "Title and Description both are required");
  }
  let videoLocalPath, thumbnailLocalPath;
  if (
    req.files &&
    req.files.videoFile &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoLocalPath = req.files.videoFile[0].path;
  } else {
    throw new ApiError(400, "videoFile is required");
  }
  if (
    req.files &&
    req.files.thumbnail &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  } else {
    throw new ApiError(400, "thumbnail is required");
  }

  if (!videoLocalPath) {
    throw new ApiError(400, "videoFile is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail is required");
  }

  const videofilecloudinaryUrl = await uploadOnCloudinary(videoLocalPath);
  const thumbNailCloudinaryUrl = await uploadOnCloudinary(thumbnailLocalPath);
  if (!videofilecloudinaryUrl) {
    throw new ApiError(400, "videoFile is required");
  }
  if (!thumbNailCloudinaryUrl) {
    throw new ApiError(400, "thumbnail is required");
  }

  const newVideo = await VIDEO.create({
    title,
    description,
    videoFile: videofilecloudinaryUrl.url,
    thumbNail: thumbNailCloudinaryUrl.url,
    duration: videofilecloudinaryUrl.duration,
    owner: req.user?._id,
  });
  const isVideoExist = await VIDEO.findById(newVideo._id).populate({
    path: "owner",
    select: "-password -refreshToken",
  });
  if (!isVideoExist) {
    throw new ApiError(500, "Video can not be created");
  }
  res
    .status(200)
    .json(new ApiResponse(200, isVideoExist, "Video Created Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const id = new mongoose.Types.ObjectId(videoId);
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is incorrect");
  }
  const video = await VIDEO.findById(id).populate({
    path: "owner",
    select: "-password -refreshToken",
  });
  if (!video) {
    throw new ApiError(400, "Video cannnot be fetched. VideoId is incorrect");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched Successfully"));
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const id = new mongoose.Types.ObjectId(videoId);
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is incorrect");
  }
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;
  let thumbnailCloudinaryUrl;
  if (thumbnailLocalPath) {
    // user wants to update the thumbnail as well
    thumbnailCloudinaryUrl = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnailCloudinaryUrl) {
      throw new ApiError(500, "could not upload it on cloudinary");
    }
  }

  const oldVideoDetails = await VIDEO.findById(id).populate({
    path: "owner",
    select: "-password -refreshToken",
  });
  if (!oldVideoDetails) {
    throw new ApiError(400, "Video cannnot be fetched. VideoId is incorrect");
  }
  const oldThumbnailCloudinaryUrl = oldVideoDetails.thumbNail;
  const oldThumbnailPublic_id = oldThumbnailCloudinaryUrl
    .split("/")
    .pop()
    .split(".")[0];
  await deleteFromCloudinary(oldThumbnailPublic_id);
  if (title) {
    oldVideoDetails.title = title;
  }
  if (description) {
    oldVideoDetails.description = description;
  }
  if (thumbnailLocalPath) {
    oldVideoDetails.thumbNail = thumbnailCloudinaryUrl.url;
  }
  await oldVideoDetails.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        oldVideoDetails,
        "Video details updated Successfully"
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  const id = new mongoose.Types.ObjectId(videoId);
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is incorrect");
  }
  const video = await VIDEO.findByIdAndDelete(id);
  if (!video) {
    throw new ApiError(400, "Video cannnot be fetched. VideoId is incorrect");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video has been deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const id = new mongoose.Types.ObjectId(videoId);
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video is not fetched as VideoId is incorrect");
  }
  const video = await VIDEO.findById(id).populate({
    path: "owner",
    select: "-password -refreshToken",
  });
  if (!video) {
    throw new ApiError(400, "Video cannot be fetched");
  }
  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Toggled successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
