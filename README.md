# Slack Image Processing Bot

A Slack bot that allows users to upload and process images with various adjustments like saturation, brightness, and contrast.

## Features

- Upload multiple images in a Slack channel
- Process images in batch with consistent settings
- Adjust saturation, brightness, and contrast
- Random mode for automated adjustments
- Adds subtle, invisible metadata to processed images

## Setup Instructions

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Choose "From scratch" and name your app (e.g., "Image Prep Bot")
3. Select the workspace where you want to install the app

### 2. Configure Bot Permissions

1. In the sidebar, click on "OAuth & Permissions"
2. Under "Scopes", add the following Bot Token Scopes:
   - `chat:write` - Send messages as the app
   - `commands` - Add slash commands
   - `files:read` - Access files uploaded to channels
   - `files:write` - Upload files to channels
   - `channels:history` - View messages and files in channels

### 3. Create a Slash Command

1. In the sidebar, click on "Slash Commands"
2. Click "Create New Command" and use these settings:
   - Command: `/imageprep`
   - Short Description: "Process images with custom adjustments"
   - Usage Hint: "Upload images and process them"
   - Escape channels, users, and links: Check this option

### 4. Enable Socket Mode

1. In the sidebar, click on "Socket Mode"
2. Enable Socket Mode (toggle it on)
3. Create an app-level token with the `connections:write` scope
4. Save the generated app token (starts with `xapp-`)

### 5. Subscribe to Events

1. In the sidebar, click on "Event Subscriptions"
2. Enable Events (toggle it on)
3. Under "Subscribe to bot events", add the following events:
   - `file_shared` - Subscribe to file shared events

### 6. Install the App to Your Workspace

1. In the sidebar, click on "Install App"
2. Click "Install to Workspace"
3. Review the permissions and click "Allow"
4. Copy the Bot User OAuth Token (starts with `xoxb-`)

### 7. Configure Environment Variables

1. Create a `.env` file in the project directory
2. Add the following variables:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_APP_TOKEN=xapp-your-app-token
   ```
3. Replace the placeholder values with your actual tokens

### 8. Install Dependencies and Run

1. Install the required npm packages:
   ```
   npm install
   ```
2. Start the bot:
   ```
   npm start
   ```

## Usage

1. In any channel where the bot is installed, type `/imageprep`
2. Upload one or more images to the channel
3. Click the "Process Images" button
4. Choose your desired image adjustments:
   - Saturation (0-2, where 1 is normal)
   - Brightness (-1 to 1, where 0 is normal)
   - Contrast (0-2, where 1 is normal)
   - Or select "Random Mode" for random adjustments
5. Click "Process All" to start processing
6. The bot will upload the processed images to the channel

## Notes

- Image processing can take time depending on the size and number of images
- For best results, use JPEG or PNG image formats
- Very large images may fail to process due to memory constraints

## License

ISC 