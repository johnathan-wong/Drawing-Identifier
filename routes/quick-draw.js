const express = require('express')
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const router = express.Router()


router.get('/labels', async (req, res) => {
    const labels = ['apple', 'bicycle', 'butterfly', 'camera', 'cup', 'parachute', 'skull', 'spider', 'star', 't-shirt', 'airplane', 'axe', 'bowtie', 'candle', 'cloud', 'crown', 'hat', 'mushroom', 'vase', 'mountain']
    res.json(labels);
})

router.get('/models', async (req, res) => {
    // Return Pre-trained Models
    try {
        const model1Path = path.join(__dirname, `../models/quick-draw_Model/LeNet5-Model.json`);
        const model2Path = path.join(__dirname, `../models/quick-draw_Model/Tester-Model.json`);
        const model3Path = path.join(__dirname, `../models/quick-draw_Model/Tester-Model2.json`);

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
    res.render('quickdraw/index');
})

module.exports = router;