# Use a Node.js base image
FROM node:16

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json for dependency installation
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the application code into the container
COPY . .

# Expose the application port
EXPOSE 3005

# Start the application
CMD ["npm", "start"]
