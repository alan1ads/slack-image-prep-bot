const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { processImage } = require('./imageProcessor');
const https = require('https');
require('dotenv').config();

// Debug lines to check if tokens are loaded
console.log('Bot Token:', process.env.SLACK_BOT_TOKEN ? 'Found' : 'Missing');
console.log('App Token:', process.env.SLACK_APP_TOKEN ? 'Found' : 'Missing');

// App initialization with port configuration
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
});

// Create temp directories
const inputDir = path.join(__dirname, 'temp', 'input');
const outputDir = path.join(__dirname, 'temp', 'output');

// Create temp directories with error handling
try {
    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('Temp directories created/verified:');
    console.log('Input directory:', inputDir);
    console.log('Output directory:', outputDir);
} catch (error) {
    console.error('Error creating temp directories:', error);
}

// Store for pending images
const pendingImages = new Map();

// Download function with proper headers
async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(outputPath);
        
        const options = {
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
            }
        };

        https.get(url, options, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }

            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log('File downloaded successfully to:', outputPath);
                resolve(outputPath);
            });

            fileStream.on('error', (err) => {
                fs.unlink(outputPath, () => {}); // Delete the file if there's an error
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(outputPath, () => {}); // Delete the file if there's an error
            reject(err);
        });
    });
}

// Handle slash command
app.command('/imageprep', async ({ command, ack, client }) => {
    try {
        await ack();
        
        // Clear any existing pending images for this channel
        pendingImages.set(command.channel_id, []);

        await client.chat.postMessage({
            channel: command.channel_id,
            text: "Upload your images to this channel. When you're done uploading, click 'Process Images' to modify them all at once.",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*Upload Multiple Images:*\n1️⃣ Upload all your images to this channel\n2️⃣ Click the button below when done uploading\n3️⃣ Set processing options for all images"
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Process Images",
                                emoji: true
                            },
                            action_id: "process_multiple_images"
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error('Error handling slash command:', error);
    }
});

// Handle file sharing
app.event('file_shared', async ({ event, client }) => {
    try {
        const result = await client.files.info({
            file: event.file_id
        });

        const file = result.file;
        
        // Skip if this is a processed image (check the filename)
        if (file.name.startsWith('Processed_')) {
            console.log('Skipping processed image:', file.name);
            return;
        }

        // Check if it's an image file
        const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
        if (!acceptedImageTypes.includes(file.mimetype)) {
            await client.chat.postMessage({
                channel: event.channel_id,
                text: "Please share only image files (JPEG, PNG, GIF, BMP, WebP)."
            });
            return;
        }

        // Add to pending images
        let channelImages = pendingImages.get(event.channel_id) || [];
        channelImages.push({
            file: file,
            file_id: event.file_id
        });
        pendingImages.set(event.channel_id, channelImages);

        await client.chat.postMessage({
            channel: event.channel_id,
            text: `Image added to queue! (${channelImages.length} images ready for processing)`
        });

    } catch (error) {
        console.error(error);
    }
});

app.action('process_multiple_images', async ({ ack, body, client }) => {
    await ack();
    
    const channelImages = pendingImages.get(body.channel.id) || [];
    
    if (channelImages.length === 0) {
        await client.chat.postMessage({
            channel: body.channel.id,
            text: "No images found to process. Please upload some images first!"
        });
        return;
    }

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'image_processing_modal',
                title: {
                    type: 'plain_text',
                    text: 'Process Images'
                },
                submit: {
                    type: 'plain_text',
                    text: 'Process All'
                },
                close: {
                    type: 'plain_text',
                    text: 'Cancel'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Processing ${channelImages.length} images*`
                        }
                    },
                    // Add random mode checkbox
                    {
                        type: 'input',
                        block_id: 'random_mode',
                        optional: true,
                        element: {
                            type: 'checkboxes',
                            action_id: 'random_mode_checkbox',
                            options: [
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Use Random Mode (all parameters will be randomly generated)',
                                        emoji: true
                                    },
                                    value: 'random'
                                }
                            ]
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Processing Mode',
                            emoji: true
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'saturation_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'saturation_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 1.2 for 20% more saturated)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Saturation Adjustment'
                        },
                        optional: true
                    },
                    {
                        type: 'input',
                        block_id: 'brightness_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'brightness_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 0.1 for 10% brighter, -0.1 for 10% darker)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Brightness Adjustment'
                        },
                        optional: true
                    },
                    {
                        type: 'input',
                        block_id: 'contrast_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'contrast_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 1.2 for 20% more contrast)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Contrast Adjustment'
                        },
                        optional: true
                    }
                ],
                private_metadata: body.channel.id
            }
        });
    } catch (error) {
        console.error('Error opening modal:', error);
    }
});

// Handle modal submission
app.view('image_processing_modal', async ({ ack, body, view, client }) => {
    await ack();

    const channelId = view.private_metadata;
    const channelImages = pendingImages.get(channelId) || [];
    
    if (channelImages.length === 0) {
        console.error('No images found to process');
        return;
    }

    // Check if random mode is selected
    const randomMode = view.state.values.random_mode.random_mode_checkbox.selected_options?.length > 0;
    
    // Get values based on mode (random or manual)
    let saturation, brightness, contrast;
    
    if (randomMode) {
        // Generate random values within specified ranges
        saturation = (Math.random() * 2).toFixed(2);                   // 0 to 2
        brightness = (Math.random() * 2 - 1).toFixed(2);               // -1 to 1
        contrast = (Math.random() * 2).toFixed(2);                     // 0 to 2
        
        // Log the random values
        console.log('Using random mode with values:', {
            saturation,
            brightness,
            contrast
        });
        
        // Notify user that random values are being used
        await client.chat.postMessage({
            channel: channelId,
            text: `Processing images with random adjustments:\n• Saturation: ${saturation}\n• Brightness: ${brightness}\n• Contrast: ${contrast}`
        });
    } else {
        // Use manual values from form
        saturation = parseFloat(view.state.values.saturation_adjustment.saturation_input.value || "1");
        brightness = parseFloat(view.state.values.brightness_adjustment.brightness_input.value || "0");
        contrast = parseFloat(view.state.values.contrast_adjustment.contrast_input.value || "1");
        
        // Apply limits to manual inputs
        saturation = Math.max(0, Math.min(2, saturation));                // Limit 0 to 2
        brightness = Math.max(-1, Math.min(1, brightness));               // Limit -1 to 1
        contrast = Math.max(0, Math.min(2, contrast));                    // Limit 0 to 2
    }

    try {
        // Notify start of processing
        await client.chat.postMessage({
            channel: channelId,
            text: `Starting to process ${channelImages.length} images... This might take a while.`
        });

        // Process images sequentially with delay between each
        for (const imageInfo of channelImages) {
            try {
                const inputPath = path.join(inputDir, `input_${imageInfo.file_id}${path.extname(imageInfo.file.name)}`);
                const outputPath = path.join(outputDir, `output_${imageInfo.file_id}${path.extname(imageInfo.file.name)}`);

                console.log('Processing image:', imageInfo.file.name);
                
                // Download
                await downloadFile(imageInfo.file.url_private_download, inputPath);
                console.log('Download completed for:', imageInfo.file.name);
                
                // Add a small delay between operations
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Process
                try {
                    await processImage(inputPath, outputPath, saturation, brightness, contrast);
                    console.log('Processing completed for:', imageInfo.file.name);

                    // Upload
                    await client.files.uploadV2({
                        channel_id: channelId,
                        file: fs.createReadStream(outputPath),
                        filename: `Processed_${imageInfo.file.name}`,
                        title: `Processed_${imageInfo.file.name}`
                    });
                    console.log('Upload completed for:', imageInfo.file.name);

                    await client.chat.postMessage({
                        channel: channelId,
                        text: `✅ Processed: ${imageInfo.file.name}`
                    });
                } catch (processError) {
                    console.error(`Error processing image: ${processError.message}`);
                    await client.chat.postMessage({
                        channel: channelId,
                        text: `⚠️ Warning: ${imageInfo.file.name} was too large to process. Try a smaller image.`
                    });
                }

                // Cleanup regardless of success or failure
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

                // Add delay between images
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`Error processing image ${imageInfo.file_id}:`, error);
                await client.chat.postMessage({
                    channel: channelId,
                    text: `❌ Error processing image ${imageInfo.file.name}: ${error.message}`
                });
            }
        }

        // Clear the pending images queue after processing is complete
        pendingImages.set(channelId, []);

        await client.chat.postMessage({
            channel: channelId,
            text: "✅ All images have been processed! Use /imageprep again if you want to process more images."
        });

    } catch (error) {
        console.error('Detailed error:', error);
        await client.chat.postMessage({
            channel: channelId,
            text: "Sorry, there was an error processing your images. Error: " + error.message
        });
    }
});

// Create a basic HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Slack bot is running!');
});

// Start the app
(async () => {
    try {
        await app.start();
        console.log('⚡️ Bolt app is running!');
        
        // Start HTTP server
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`HTTP server is running on port ${PORT}`);
        });
        
        // Log more information about the server
        console.log('Environment:', process.env.NODE_ENV);
    } catch (error) {
        console.error('Error starting app:', error);
        process.exit(1);
    }
})(); 