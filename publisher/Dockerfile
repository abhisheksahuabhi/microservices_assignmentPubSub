# Base image
FROM node:16

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json index.js /app/
RUN npm install

# Copy application code
COPY . .

# Expose port for receiver service
EXPOSE 3000

# Command to start the service
CMD ["node", "index"]