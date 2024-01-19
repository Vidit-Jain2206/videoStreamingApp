import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { COMMENT } from "../models/comment.model.js";
import { VIDEO } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is not valid");
  }
  const video = await VIDEO.findById(videoId);
  if (!video) {
    throw new ApiError(400, "video can not be found");
  }
  const commentAggregate = COMMENT.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
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
  ]);
  const comments = await COMMENT.aggregatePaginate(commentAggregate, {
    page,
    limit,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "No comments found"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await VIDEO.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video does not exists");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "content is required");
  }
  const comment = await COMMENT.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });
  const isComment = await COMMENT.findById(comment?._id)
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "-password -refreshToken",
      },
    })
    .populate({
      path: "owner",
      select: "-password -refreshToken",
    });
  if (!isComment) {
    throw new ApiError(500, "comment cannot be created");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, isComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "CommentId is not valid");
  }

  const isComment = await COMMENT.findById(commentId);
  if (!isComment) {
    throw new ApiError(400, "Comment cannot be found");
  }
  if (isComment.owner !== res.user._id) {
    throw new ApiError("Only owner can update the comment");
  }

  const comment = await COMMENT.findByIdAndUpdate(
    commentId,
    { content },
    { new: true }
  )
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "-password -refreshToken",
      },
    })
    .populate({
      path: "owner",
      select: "-password -refreshToken",
    });
  if (!comment) {
    throw new ApiError(400, "Comment can not be updated");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment updated Successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment is not valid");
  }

  const isComment = await COMMENT.findById(commentId);
  if (!isComment) {
    throw new ApiError(400, "Comment cannot be found");
  }
  if (isComment !== req.user?._id) {
    throw new ApiError("Only owner can delete the comment");
  }

  const comment = await COMMENT.findByIdAndDelete(commentId);
  if (!comment) {
    throw new ApiError(
      400,
      "Comment can not be deleted. Comment can not found"
    );
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
