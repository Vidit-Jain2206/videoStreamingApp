import "dotenv/config";
import express from "express";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    // app.on("error", (error) => {
    //   console.log(`ERROR:- ${error}`);
    //   throw error;
    // });
    app.listen(PORT, () => {
      console.log(`Server is runnning on PORT:- ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Mongo db Connection failed:", error);
  });
