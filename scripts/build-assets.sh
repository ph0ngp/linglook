#!/bin/bash

# Check that BUGSNAG_API_KEY is set
if [ -n "$BUGSNAG_API_KEY" ]; then
  echo "BUGSNAG_API_KEY set."
else
  echo "BUGSNAG_API_KEY is not set."
  exit 1
fi

# Check if jq is installed
if ! command -v jq &>/dev/null; then
  echo "jq is not installed. Please install jq to use this script."
  exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &>/dev/null; then
  echo "pnpm is not installed. Please install pnpm to use this script."
  exit 1
fi

# Get the directory containing the script
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get the parent directory of the script's directory
parent_dir="$(dirname "$script_dir")"

# Set the current working directory to the script's directory
cd "$parent_dir"
echo -e "Running from ${parent_dir}"

# Check for package.json
if [ ! -f "./package.json" ]; then
  echo "package.json file not found"
  cd -
  exit 1
fi

# Read package version
version=$(jq -r .version "./package.json")
if [ "$version" = "" ]; then
  echo "version not found"
  exit 1
fi

echo -e "Building assets for version ${version}...\n"

# Make sure the output directory is available
mkdir -p release-assets

# Firefox package
RELEASE_BUILD=1 pnpm package:firefox
mv dist-firefox-package/wenzi_-${version}.zip release-assets/wenzi-${version}-firefox.zip

# Chrome package
RELEASE_BUILD=1 pnpm package:chrome
mv dist-chrome-package/wenzi_-${version}.zip release-assets/wenzi-${version}-chrome.zip

# Chrome-Electron package
RELEASE_BUILD=1 pnpm package:chrome-electron
mv dist-chrome-electron-package/wenzi_-${version}.zip release-assets/wenzi-${version}-chrome-electron.zip

# Edge package
RELEASE_BUILD=1 pnpm package:edge
mv dist-edge-package/wenzi_-${version}.zip release-assets/wenzi-${version}-edge.zip

# Thunderbird package
RELEASE_BUILD=1 pnpm package:thunderbird
mv dist-thunderbird-package/wenzi_-${version}.zip release-assets/wenzi-${version}-thunderbird.zip

# Source package
RELEASE_BUILD=1 pnpm zip-src
mv dist-src/wenzi-${version}-src.zip release-assets/

# Copy raw source files too
cp dist-firefox/10ten-ja-*.js release-assets/

# Restore current working directory
cd -
