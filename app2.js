const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure AWS S3
const s3 = new AWS.S3();
const S3_BUCKET = 'your-s3-bucket-name'; // Replace with your S3 bucket name

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json({ limit: '50mb' }));
app.set('view engine', 'ejs');

// Utility function to upload video to S3
const uploadRecordingToS3 = (filePath) => {
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const params = {
        Bucket: S3_BUCKET,
        Key: `recordings/${fileName}`,
        Body: fileContent,
    };

    return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
            if (err) {
                console.error('Error uploading to S3:', err);
                reject(err);
            } else {
                console.log('File uploaded successfully to S3:', data.Location);
                resolve(data.Location);
            }
        });
    });
};

// Handle socket connections
io.on('connection', (socket) => {
    console.log('Laptop connected:', socket.id);

    // Broadcast start-camera event to laptop client
    socket.on('camera-start', () => {
        console.log('Laptop server: Start camera command received');
        io.emit('starting-camera');
    });

    // Broadcast stop-camera event to laptop client
    socket.on('camera-stop', () => {
        console.log('Laptop server: Stop camera command received');
        io.emit('stoping-camera');
    });
});

// Endpoint to save video locally and upload to S3
app.post('/save-video', async (req, res) => {
    const { videoData } = req.body;

    try {
        const videoBuffer = Buffer.from(videoData, 'base64');
        const filePath = path.join(__dirname, 'public', `video-${Date.now()}.webm`);

        // Save video locally
        fs.writeFileSync(filePath, videoBuffer);
        console.log('Video saved locally:', filePath);

        // Upload video to S3
        const s3Url = await uploadRecordingToS3(filePath);

        // Clean up local file
        fs.unlinkSync(filePath);

        res.status(200).json({ message: 'Video saved and uploaded successfully', url: s3Url });
    } catch (err) {
        console.error('Error saving video:', err);
        res.status(500).send('Failed to save and upload video');
    }
});

app.get('/', (req, res) => {
    res.render('server');
});

// Start the server
const LAPTOP_PORT = 4000;
server.listen(LAPTOP_PORT, '0.0.0.0', () => {
    console.log(`Laptop server running at http://0.0.0.0:${LAPTOP_PORT}`);
});