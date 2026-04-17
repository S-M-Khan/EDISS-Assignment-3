# Use a slim Node image for smaller footprint
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# The port is handled via environment variables in docker-compose
# but we document the container's internal port here.
EXPOSE 3000

# Start the service
CMD [ "node", "index.js" ]