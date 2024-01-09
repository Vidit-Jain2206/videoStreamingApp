import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { USER } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation
  //check if user already exists:username,email
  //check for images, check for avatar
  //upload them to cloudinary
  //create user object - create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return res

  const { fullName, email, password, username } = req.body;
  if (!fullName || !email || !password || !username) {
    throw new ApiError(400, "All fields are required");
  }

  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await USER.findOne({
    $or: [{ username }, { email }],
  });
  if (user) {
    throw new ApiError(409, "User already exists");
  }

  let avatarLocalPath, coverImageLocalPath;
  if (
    req.files &&
    req.files.avatar &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  } else {
    throw new ApiError(400, "Avatar Image is required");
  }
  if (
    req.files &&
    req.files.coverImage &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  } else {
    throw new ApiError(400, "coverImage is required");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Image is required");
  }

  const avatarCloudinaryUrl = await uploadOnCloudinary(avatarLocalPath);
  const coverImageCloudinaryUrl = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatarCloudinaryUrl) {
    throw new ApiError(400, "Avatar Image is required");
  }

  const newUser = await USER.create({
    fullName,
    avatar: avatarCloudinaryUrl.url,
    coverImage: coverImageCloudinaryUrl?.url || "",
    username: username.toLowerCase(),
    email,
    password,
  });

  const isUserCreated = await USER.findById(newUser._id).select(
    "-password -refreshToken"
  );
  if (!isUserCreated) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, isUserCreated, "User registered successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  // take input from user
  // validate the fields
  // check the user if it exists or not
  // generate tokens
  // return token

  const { username, email, password } = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await USER.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not Exist");
  }
  const isPaswordValid = await user.isPasswordCorrect(password);
  if (!isPaswordValid) {
    throw new ApiError(404, "Invalid User credentials");
  }

  //generate tokens and store refreshToken in database
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await USER.findById(user._id).select(
    "-password -refreshToken"
  );

  //set cookies

  //these cookies can be updated from server not by frontend
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await USER.findByIdAndUpdate(
    userId,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User loggedOut"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Request");
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await USER.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    // generate tokens
    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "User logged in successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message);
  }
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const userId = req.user._id;
  const user = await USER.findById(userId);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  console.log(user);
  res.status(200).json(new ApiResponse(200, {}, "Password updated"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  return res
    .status(200)
    .json(new ApiResponse(200, user, "current user fetched successfully"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username, email, fullName } = req.body;
  if (!(username || email || fullName))
    throw new ApiError(400, "All fields are required");

  const user = await USER.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        username,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
  let avatarLocalPath;
  if (req.file && req.file.path) {
    avatarLocalPath = req.file.path;
  } else {
    throw new ApiError(400, "Avatar Image is required!!!");
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Image is required");
  }

  // store the old public url of avatar
  const oldAvatarPublicUrl = (await USER.findById(req.user._id)).avatar;
  const oldAvatarPublic_id = oldAvatarPublicUrl.split("/").pop().split(".")[0];

  const avatarCloudinaryUrl = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarCloudinaryUrl) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await USER.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarCloudinaryUrl.url,
      },
    },
    { new: true }
  ).select("-password");

  //delete the oldAvatarPublicUrl from cloudinary
  const result = await deleteFromCloudinary(oldAvatarPublic_id);
  if (!result) {
    throw new ApiError(500, error.message);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image Successfully updated"));
});

export const updateUserCoverImage = asyncHandler(async (req, res) => {
  let coverImageLocalPath;
  if (req.file && req.file.path) {
    coverImageLocalPath = req.file.path;
  } else {
    throw new ApiError(400, "coverImage is required");
  }
  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage is required");
  }

  // store the old public url of coverImage
  const oldCoverImagePublicUrl = (await USER.findById(req.user?._id))
    .coverImage;

  const oldCoverImagePublic_id = oldCoverImagePublicUrl
    .split("/")
    .pop()
    .split(".")[0];

  const coverImageCloudinaryUrl = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImageCloudinaryUrl) {
    throw new ApiError(400, "Error while uploading coverImage");
  }
  const user = await USER.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImageCloudinaryUrl.url,
      },
    },
    { new: true }
  ).select("-password");

  //delete the oldCoverImagePublicUrl from cloudinary
  const result = await deleteFromCloudinary(oldCoverImagePublic_id);
  if (!result) {
    throw new ApiError(500, error.message);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage Successfully updated"));
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username.trim()) {
    throw new ApiError(400, "Username required");
  }
  const channel = await USER.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log(channel);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel fetched successfully")
    );
});

export const getUserWatchHistory = asyncHandler(async (req, res) => {
  const videos = await USER.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistoryVideoDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "watchHistoryVideoOwnerDetails",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$watchHistoryVideoOwnerDetails",
              },
            },
          },
        ],
      },
    },
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videos[0].watchHistory,
        "Watch History Fetched successfully"
      )
    );
});
