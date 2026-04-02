module.exports = {
  apps: [
    {
      name: "fishtokri-api",
      script: "./artifacts/api-server/dist/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 8080,
        MONGODB_URI: "mongodb+srv://raneaniket23_db_user:0lEZL6KqIATNmZsj@fishtokricluster.vhw7jp9.mongodb.net/?appName=Fishtokricluster",
        JWT_SECRET: "uGq9W0z3yoVLUyY0JMgq8OHxFYCU1yd4WGVseQoAs2VrsLrUGhv5DaHJZXmD/nTXNYPUkcT2OE05Wmzbqpdi0g==",
        CLOUDINARY_CLOUD_NAME: "dbkmmxnzd",
        CLOUDINARY_API_KEY: "935594792745712",
        CLOUDINARY_API_SECRET: "ouFPGE7SlNoQAG_OR7IT5sdFiiU",
      },
    },
  ],
};
