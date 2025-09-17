# Use Node.js 22 with all dependencies for Puppeteer
FROM node:22-slim

# Install dependencies needed for Chromium AND emoji fonts
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    fonts-noto-color-emoji \
    fonts-dejavu-core \
    fontconfig \
    --no-install-recommends

# Clean up to reduce image size
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Download Google's Noto Color Emoji font manually as backup
# (in case the package version is outdated)
RUN mkdir -p /usr/share/fonts/truetype/noto && \
    wget -q "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf" \
    -O /usr/share/fonts/truetype/noto/NotoColorEmoji.ttf || true

# Update font cache to recognize all fonts
RUN fc-cache -f -v

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
