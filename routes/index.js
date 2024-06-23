const express = require('express')
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const util = require('util');
const sharp = require('sharp');
const router = express.Router()



// API Endpoints to serve JSON data
router.get('/data/images/:imageName', async (req, res) => {
    const { imageName } = req.params;
    try {
        const imagePath = path.join(__dirname, '../data/mnist_images', imageName);
        const imageData = await fs.readFile(imagePath);

        const { data, info } = await sharp(imageData)
            .ensureAlpha() // Ensure RGBA format if alpha channel is missing
            .raw() // Output raw pixel data
            .toBuffer({ resolveWithObject: true });

        const responseObj = {
            data: data,
            info: info
        };
        res.send(responseObj);
        // res.setHeader('Content-Type', 'image/png'); // Adjust the content type based on the image format
        // res.send(imageData);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: `Failed to read` });
    }
});

router.get('/data/:labels/:start/:batchSize', async (req, res) => {
    const { labels, start, batchSize } = req.params;
    const startIndex = parseInt(start, 10);
    const batchSizeInt = parseInt(batchSize, 10);
    const labelsFilePath = path.join(__dirname, `../data/mnist_images/${labels}_labels.json`);

    try {
        const labelData = await fs.readFile(labelsFilePath, 'utf8');
        const labelArray = JSON.parse(labelData);

        // Validate start and batchSize
        if (isNaN(startIndex) || isNaN(batchSizeInt) || startIndex < 0 || batchSizeInt <= 0) {
            return res.status(400).json({ error: 'Invalid start index or batch size' });
        }

        // Get the requested batch of labels
        const labelBatch = labelArray.slice(startIndex, startIndex + batchSizeInt);
        res.json(labelBatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Failed to load labels from ${start} to ${startIndex + batchSizeInt}` });
    }
});

router.get('/models', async (req, res) => {
    // Return Pre-trained Models
    try {
        const model1Path = path.join(__dirname, `../models/10k-trained_model.json`);
        const model2Path = path.join(__dirname, `../models/50k-trained_model.json`);
        const model3Path = path.join(__dirname, `../models/30k-trained_model.json`);

        const [model1Data, model2Data, model3Data] = await Promise.all([
            fs.readFile(model1Path, 'utf8'),
            fs.readFile(model2Path, 'utf8'),
            fs.readFile(model3Path, 'utf8')
        ]);

        const models = {
            model1: JSON.parse(model1Data),
            model2: JSON.parse(model2Data),
            model3: JSON.parse(model3Data)
        };

        res.json(models);
    } catch (error) {
        console.error('Error reading model files:', error);
        res.status(500).json({ error: 'Failed to load models' });
    }
})

router.get('/', async (req, res) => {
    res.render('index')
})


module.exports = router