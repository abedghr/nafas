const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const excludedDirs = [
  path.resolve(__dirname, ".local"),
  path.resolve(__dirname, "tmp"),
];

config.resolver = config.resolver || {};
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
  ? [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  ...excludedDirs.map((dir) => new RegExp(`^${escapeRegExp(dir)}[/\\\\]`)),
];

module.exports = config;
