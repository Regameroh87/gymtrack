const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Monorepo: el proyecto Expo vive en apps/mobile; la raíz contiene
// packages/core (workspace) y el node_modules hoisteado.
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Metro vigila todo el monorepo (para ver cambios en packages/core).
config.watchFolders = [monorepoRoot];

// 2. Resolver módulos primero desde apps/mobile y luego desde la raíz hoisteada.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.sourceExts.push("sql");

module.exports = withNativeWind(config, { input: "./global.css" });
