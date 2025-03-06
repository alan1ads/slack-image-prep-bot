const Jimp = require('jimp');
const path = require('path');

function generateRandomMetadata() {
    // More varied date ranges
    const randomYear = 2018 + Math.floor(Math.random() * 7); // 2018-2024
    const randomMonth = 1 + Math.floor(Math.random() * 12);
    const randomDay = 1 + Math.floor(Math.random() * 28);
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const randomSec = Math.floor(Math.random() * 60);
    
    // Expanded device list with more specific naming
    const devices = [
        // Phones with specific model numbers
        { brand: "iPhone", models: ["11 Pro", "12", "13 Pro Max", "14", "15 Pro", "SE"] },
        { brand: "Samsung Galaxy", models: ["S21", "S22 Ultra", "S23", "A53", "Note 20", "Z Flip 4"] },
        { brand: "Google Pixel", models: ["6", "7 Pro", "8", "6a", "7a", "Fold"] },
        { brand: "Xiaomi", models: ["Mi 11", "Redmi Note 10", "13T Pro", "Poco F5"] },
        { brand: "OnePlus", models: ["9 Pro", "10T", "11", "Nord 3"] },
        
        // Cameras with more specific model details
        { brand: "Sony", models: ["Alpha a7 III", "Alpha a6400", "ZV-1", "RX100 VII"] },
        { brand: "Canon", models: ["EOS R6", "EOS 90D", "PowerShot G7 X", "EOS M50"] },
        { brand: "Nikon", models: ["Z6 II", "D780", "D7500", "Coolpix P1000"] },
        { brand: "GoPro", models: ["Hero 10 Black", "Hero 11", "Max"] }
    ];
    
    // Randomly select a device brand and model
    const deviceBrand = devices[Math.floor(Math.random() * devices.length)];
    const deviceModel = `${deviceBrand.brand} ${deviceBrand.models[Math.floor(Math.random() * deviceBrand.models.length)]}`;
    
    // Software/apps used for recording
    const software = [
        "Instagram", "Snapchat", "Camera App", "Lightroom", 
        "Photoshop", "VSCO", "Snapseed", "Pixlr", "Canva"
    ];
    const randomSoftware = software[Math.floor(Math.random() * software.length)];
    
    // Camera settings
    const resolutions = ["1920x1080", "3840x2160", "1280x720", "2560x1440", "4000x3000"];
    const randomResolution = resolutions[Math.floor(Math.random() * resolutions.length)];
    
    // Random location data
    const locations = [
        "New York", "Los Angeles", "Chicago", "Miami", "London", "Paris", 
        "Tokyo", "Sydney", "Berlin", "Toronto", "Barcelona", "Seoul"
    ];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    // Random GPS coordinates - not too precise to maintain some privacy
    const randomLat = (Math.random() * 180 - 90).toFixed(4);
    const randomLong = (Math.random() * 360 - 180).toFixed(4);
    
    // Format the date strings with proper padding
    const dateString = `${randomYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`;
    const timeString = `${String(randomHour).padStart(2, '0')}:${String(randomMin).padStart(2, '0')}:${String(randomSec).padStart(2, '0')}`;
    
    return {
        creation_time: `${dateString} ${timeString}`,
        date: dateString,
        year: String(randomYear),
        device_model: deviceModel,
        software: randomSoftware,
        resolution: randomResolution,
        location: randomLocation,
        gps: `${randomLat}, ${randomLong}`
    };
}

async function processImage(inputPath, outputPath, saturation, brightness, contrast) {
    return new Promise(async (resolve, reject) => {
        try {
            // Apply limits to parameters
            saturation = Math.max(0, Math.min(2, saturation));    // Limit 0 to 2
            brightness = Math.max(-1, Math.min(1, brightness));   // Limit -1 to 1
            contrast = Math.max(0, Math.min(2, contrast));        // Limit 0 to 2
            
            console.log(`Processing image with: Saturation=${saturation}, Brightness=${brightness}, Contrast=${contrast}`);
            
            // Read image using Jimp
            const image = await Jimp.read(inputPath);
            
            // Apply adjustments
            if (saturation !== 1) {
                // Convert saturation from 0-2 range to Jimp's range
                // In Jimp, negative values decrease saturation, positive increase it
                const jimpSaturation = (saturation - 1) * 100; // Convert to percentage
                image.color([{ apply: 'saturate', params: [jimpSaturation] }]);
            }
            
            if (brightness !== 0) {
                // Jimp brightness works from -1 to +1
                image.brightness(brightness);
            }
            
            if (contrast !== 1) {
                // Convert contrast from 0-2 range to Jimp's range
                // Jimp contrast works from -1 to +1
                const jimpContrast = contrast - 1;
                image.contrast(jimpContrast);
            }
            
            // Add subtle noise to make the image more unique (like a light filter)
            const width = image.getWidth();
            const height = image.getHeight();
            
            // Apply subtle noise (1 in 1000 pixels)
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    if (Math.random() < 0.001) {
                        const noise = Math.floor(Math.random() * 10) - 5; // -5 to +5
                        const color = image.getPixelColor(x, y);
                        const rgba = Jimp.intToRGBA(color);
                        
                        // Adjust RGB values slightly
                        rgba.r = Math.max(0, Math.min(255, rgba.r + noise));
                        rgba.g = Math.max(0, Math.min(255, rgba.g + noise));
                        rgba.b = Math.max(0, Math.min(255, rgba.b + noise));
                        
                        const newColor = Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a);
                        image.setPixelColor(newColor, x, y);
                    }
                }
            }
            
            // Add a subtle watermark-like pattern (almost invisible)
            const metadata = generateRandomMetadata();
            const watermarkText = `${metadata.device_model} ${metadata.date}`;
            // We're not actually adding this as text since Jimp text is complex
            // Instead, we'll add a pattern of pixels in the corner
            
            // Create a pattern of pixels in bottom right (very subtle)
            for (let i = 0; i < watermarkText.length; i++) {
                const x = width - 20 + (i % 10);
                const y = height - 5 + Math.floor(i / 10);
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const color = image.getPixelColor(x, y);
                    const rgba = Jimp.intToRGBA(color);
                    // Make a very subtle change
                    rgba.a = Math.max(0, rgba.a - 1);
                    const newColor = Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a);
                    image.setPixelColor(newColor, x, y);
                }
            }
            
            // Save the image
            await image.writeAsync(outputPath);
            console.log(`Image saved to ${outputPath}`);
            
            // Add metadata to the EXIF data if possible (not all formats support this)
            // Jimp has limited EXIF support, so this is simplified
            
            // Resolve with the output path
            resolve(outputPath);
        } catch (error) {
            console.error('Error processing image:', error);
            reject(error);
        }
    });
}

module.exports = { processImage }; 