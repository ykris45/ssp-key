#!/bin/sh

echo -e "machine github.com\n  login $GH_TOKEN" > ~/.netrc

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export NODE_OPTIONS=--max_old_space_size=8192
# Install CocoaPods and yarn using Homebrew.
brew install cocoapods
brew install node@18
brew link node@18
brew install yarn

# Install dependencies
yarn
yarn bundleinstall
yarn podprod