#!/bin/bash

# Get first parameter from command line and save in variable called type
type=$1

echo "updating package.json..."
echo "changing package name to rhp $type"

if [ "$type" == "core" ]; then
    # Read the current version from rhp-core-package.json
    current_version=$(jq -r '.version' rhp-core-package.json)

    # Increment the version number without removing decimals
    new_version=$(echo $current_version | awk -F. -v OFS=. '{$NF++;print}')

    # Print the new version number to console
    echo "updating package version to $new_version"

    # Update the version number in rhp-core-package.json
    jq --arg new_version "$new_version" '.version = $new_version' rhp-core-package.json > tmp.$$.json && mv tmp.$$.json rhp-core-package.json

    # Replace contents of package.json with rhp-core-package.json
    cp rhp-core-package.json package.json
elif [ "$type" == "base" ]; then
    # Read the current version from rhp-base-package.json
    current_version=$(jq -r '.version' rhp-base-package.json)

    # Increment the version number without removing decimals
    new_version=$(echo $current_version | awk -F. -v OFS=. '{$NF++;print}')

    # Print the new version number to console
    echo "updating package version to $new_version"

    # Update the version number in rhp-base-package.json
    jq --arg new_version "$new_version" '.version = $new_version' rhp-base-package.json > tmp.$$.json && mv tmp.$$.json rhp-base-package.json

    # Replace contents of package.json with rhp-base-package.json
    cp rhp-base-package.json package.json
    
elif ["$type" == ""]; then
    # Read the current version from rhp-package.json
    current_version=$(jq -r '.version' rhp-package.json)

    # Increment the version number without removing decimals
    new_version=$(echo $current_version | awk -F. -v OFS=. '{$NF++;print}')

    # Print the new version number to console
    echo "updating package version to $new_version"

    # Update the version number in rhp-package.json
    jq --arg new_version "$new_version" '.version = $new_version' rhp-package.json > tmp.$$.json && mv tmp.$$.json rhp-package.json

    # Replace contents of package.json with rhp-package.json
    cp rhp-package.json package.json

else
    echo "Invalid command parameter. Must be 'core' or 'base'"
    exit 1
fi