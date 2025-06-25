#!/bin/bash

# This script will run the example with the given name.
# It will first change the current working directory to the example directory.
# Then it will run the example.

# Get the example name from the command line arguments
example_name=$1

# Change the current working directory to the example directory
cd examples/$example_name
bun run src/index.ts