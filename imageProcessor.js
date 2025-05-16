const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const piexif = require('piexifjs');
const extractChunks = require('png-chunks-extract');
const encodeChunks = require('png-chunks-encode');
const textChunk = require('png-chunk-text');

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
        gps: `${randomLat}, ${randomLong}`,
        lat: parseFloat(randomLat),
        long: parseFloat(randomLong)
    };
}

// Helper function to add EXIF metadata to JPEG image
function addExifMetadata(jpegImagePath, metadata) {
    try {
        // Read the JPEG image as binary data
        const jpegData = fs.readFileSync(jpegImagePath);
        const jpegDataUri = "data:image/jpeg;base64," + jpegData.toString('base64');
        
        // Create EXIF data structure
        const exifObj = {
            "0th": {
                [piexif.ImageIFD.Make]: metadata.device_model.split(' ')[0],
                [piexif.ImageIFD.Model]: metadata.device_model,
                [piexif.ImageIFD.Software]: metadata.software,
                [piexif.ImageIFD.DateTime]: metadata.creation_time
            },
            "Exif": {
                [piexif.ExifIFD.DateTimeOriginal]: metadata.creation_time,
                [piexif.ExifIFD.DateTimeDigitized]: metadata.creation_time,
                [piexif.ExifIFD.UserComment]: `Location: ${metadata.location}`
            },
            "GPS": {}
        };
        
        // Add GPS information if available
        if (metadata.lat && metadata.long) {
            // Convert decimal coordinates to GPS format
            const lat = Math.abs(metadata.lat);
            const latRef = metadata.lat >= 0 ? "N" : "S";
            const latDeg = Math.floor(lat);
            const latMin = Math.floor((lat - latDeg) * 60);
            const latSec = ((lat - latDeg) * 60 - latMin) * 60;
            
            const long = Math.abs(metadata.long);
            const longRef = metadata.long >= 0 ? "E" : "W";
            const longDeg = Math.floor(long);
            const longMin = Math.floor((long - longDeg) * 60);
            const longSec = ((long - longDeg) * 60 - longMin) * 60;
            
            exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef] = latRef;
            exifObj.GPS[piexif.GPSIFD.GPSLatitude] = [[latDeg, 1], [latMin, 1], [Math.round(latSec * 100), 100]];
            exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef] = longRef;
            exifObj.GPS[piexif.GPSIFD.GPSLongitude] = [[longDeg, 1], [longMin, 1], [Math.round(longSec * 100), 100]];
        }
        
        // Insert EXIF data into JPEG image
        const exifBytes = piexif.dump(exifObj);
        const newJpegData = piexif.insert(exifBytes, jpegDataUri);
        
        // Convert Data URI to Buffer and save
        const newJpegBinary = Buffer.from(newJpegData.split(",")[1], 'base64');
        fs.writeFileSync(jpegImagePath, newJpegBinary);
        
        console.log(`EXIF metadata added to ${jpegImagePath}`);
        return true;
    } catch (error) {
        console.error('Error adding EXIF metadata:', error);
        return false;
    }
}

// Helper function to add metadata to PNG image
function addPngMetadata(pngImagePath, metadata) {
    try {
        // Read the PNG file as binary data
        const pngBuffer = fs.readFileSync(pngImagePath);
        
        // Extract chunks from PNG
        const chunks = extractChunks(pngBuffer);
        
        // Add metadata as tEXt chunks
        chunks.splice(-1, 0, textChunk.encode('Software', metadata.software));
        chunks.splice(-1, 0, textChunk.encode('Creation Time', metadata.creation_time));
        chunks.splice(-1, 0, textChunk.encode('Device Model', metadata.device_model));
        chunks.splice(-1, 0, textChunk.encode('Location', metadata.location));
        chunks.splice(-1, 0, textChunk.encode('GPS', metadata.gps));
        chunks.splice(-1, 0, textChunk.encode('Resolution', metadata.resolution));
        
        // Encode chunks back to PNG buffer
        const newPngBuffer = Buffer.from(encodeChunks(chunks));
        
        // Write the modified PNG file
        fs.writeFileSync(pngImagePath, newPngBuffer);
        
        console.log(`PNG metadata added to ${pngImagePath}`);
        return true;
    } catch (error) {
        console.error('Error adding PNG metadata:', error);
        return false;
    }
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
            
            // Generate random metadata
            const metadata = generateRandomMetadata();
            const watermarkText = `${metadata.device_model} ${metadata.date}`;
            
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
            
            // Add metadata based on file type
            const fileExt = path.extname(outputPath).toLowerCase();
            if (fileExt === '.jpg' || fileExt === '.jpeg') {
                addExifMetadata(outputPath, metadata);
            } else if (fileExt === '.png') {
                addPngMetadata(outputPath, metadata);
            } else {
                console.log(`Metadata not added: ${fileExt} format doesn't support our metadata methods`);
            }
            
            // Resolve with the output path
            resolve(outputPath);
        } catch (error) {
            console.error('Error processing image:', error);
            reject(error);
        }
    });
}

module.exports = { processImage }; 