#!/bin/bash

# Get first parameter from command line and save in variable called type
type=$1

echo "updating rollup..."
echo "switching rollup configuration to build rhp $type"

if [ "$type" == "core" ]; then
    # Replace contents of rollup.config.mjs with rhp-core-rollup-config.mjs
    cp rhp-core-rollup-config.mjs rollup.config.mjs
elif [ "$type" == "base" ]; then
    # Replace contents of rollup.config.mjs with rhp-base-rollup-config.mjs
    cp rhp-base-rollup-config.mjs rollup.config.mjs
elif ["$type" == ""]; then
    # Replace contents of rollup.config.mjs with rhp-rollup-config.mjs
    cp rhp-rollup-config.mjs rollup.config.mjs
else
    echo "Invalid command parameter. Must be 'core' or 'base'"
    exit 1
fi