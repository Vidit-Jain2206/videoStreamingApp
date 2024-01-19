import mongoose, { isValidObjectId } from "mongoose";
import { PLAYLIST } from "../models/playlist.model.js";
import { VIDEO } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { USER } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "Name and dscription are required");
  }
  const playlist = await PLAYLIST.create({
    name,
    description,
    videos: [],
    owner: req.user?._id,
  });
  const isPlayListExists = await PLAYLIST.findById(playlist._id).populate({
    path: "owner",
    select: "-password -refreshToken",
  });
  if (!isPlayListExists) {
    throw new ApiError(400, "PlayList can not be created");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, isPlayListExists, "PlayList Created Successfully")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "UserId is not valid");
  }
  const user = await USER.findById(userId);
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  const allPlayList = await PLAYLIST.find({ owner: userId })
    .populate({
      path: "owner",
      select: "-password -refreshToken",
    })
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "-password -refreshToken",
      },
    });
  if (!allPlayList) {
    throw new ApiError(400, "PlayLists not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, allPlayList, "PlayList fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "PlayListId is not valid");
  }
  const playList = await PLAYLIST.findById(playlistId)
    .populate({
      path: "owner",
      select: "-password -refreshToken",
    })
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "-password -refreshToken",
      },
    });

  if (!playList) {
    throw new ApiError(400, "PlayList can not be found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playList, "PlayList fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "PlayListId or videoId is not valid");
  }
  const video = await VIDEO.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  const playlist = await PLAYLIST.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "playlist not found");
  }

  const newPlayList = await findByIdAndUpdate(
    playlistId,
    {
      $push: {
        video: videoId,
      },
    },
    { new: true }
  )
    .populate({
      path: "owner",
      select: "-password -refreshToken",
    })
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "-password -refreshToken",
      },
    });

  if (!newPlayList) {
    throw new ApiError(400, "PlayList can not updated");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, newPlayList, "PlayList updated"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "PlayListId or videoId is not valid");
  }
  const video = await VIDEO.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  const playlist = await PLAYLIST.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "playlist not found");
  }

  const newPlayList = await findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        video: videoId,
      },
    },
    { new: true }
  )
    .populate({
      path: "owner",
      select: "-password -refreshToken",
    })
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "-password -refreshToken",
      },
    });

  if (!newPlayList) {
    throw new ApiError(400, "PlayList can not updated");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, newPlayList, "PlayList updated"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "PlayListId is not valid");
  }
  const playlist = await PLAYLIST.findByIdAndDelete(playlistId);
  if (!playlist) {
    throw new ApiError(400, "PlayList not found");
  }
  return res
    .statua(200)
    .json(new ApiResponse(200, {}, "PlayList deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "PlayListId is not valid");
  }
  const filteredUpdatedFields = Object.entries({ name, description }).reduce(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );

  const playlist = await PLAYLIST.findByIdAndUpdate(
    playlistId,
    filteredUpdatedFields,
    { new: true }
  )
    .populate({
      path: "owner",
      select: "-password -refreshToken",
    })
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "-password -refreshToken",
      },
    });

  if (!playlist) {
    throw new ApiError(400, "PlayList is not updated");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "PlayList has been updated"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
