#!/bin/bash

# Get first parameter from command line and save in variable called type
type=$1

echo "updating rollup..."
echo "switching rollup configuration to build rhp $type"

if [ "$type" == "core" ]; then
    # Replace contents of vite.config.ts with vite.config.core.ts
    cp vite.config.core.ts vite.config.ts
elif [ "$type" == "base" ]; then
    # Replace contents of vite.config.ts with vite.config.base.ts
    cp vite.config.base.ts vite.config.ts
elif ["$type" == ""]; then
    # Replace contents of vite.config.ts with vite.config.rhp.ts
    cp vite.config.rhp.ts vite.config.ts
else
    echo "Invalid command parameter. Must be 'core' or 'base'"
    exit 1
fi