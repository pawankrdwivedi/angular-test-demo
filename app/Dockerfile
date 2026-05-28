# Use Microsoft Playwright base image which has all browser dependencies installed
FROM mcr.microsoft.com/playwright:v1.44.1-noble

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Ensure browsers are fully installed and configured
RUN npx playwright install --with-deps

# Create directories for outputs
RUN mkdir -p test_results/reports/screenshots test_results/reports/videos test_results/reports/traces test_results/allure-results test_logs

# Expose default allure server port if needed
EXPOSE 8080

# Run QA tests by default
CMD ["npm", "run", "test", "--", "--env=qa"]
