import _merge from "lodash/merge";

const appEnv = process.env.APP_ENV || "default";
const isProd = appEnv === "prod";

const config = {
  env: {
    port: process.env.PORT,
    hostName: process.env.HOST_NAME,
  },
  default: {
    appEnv,
    isProd,
    LOG: Boolean(process.env.LOG),
  },
  dev: {},
  prod: {},
};

const baseConfig = _merge(config.default, config[appEnv], config.env);

module.exports = baseConfig;
