const convnetjs = require('convnetjs');
const fs = require('fs').promises;
const sharp = require('sharp');
const path = require('path');

const folderPath = './data';

const labels = ['apple', 'bicycle', 'butterfly', 'camera', 'cup', 'parachute', 'skull', 'spider', 'star', 't-shirt'];
const labelMapping = {};
labels.forEach((label, index) => {
    labelMapping[label] = index;
});


async function readImagesFromDirectory(folderPath) {
    try {
        const files = await fs.readdir(folderPath);

        const trainImagesPath = [];
        const testImagesPath = [];

        files.forEach(file => {
            if (file.startsWith('training_')) {
                trainImagesPath.push(path.join(folderPath, file)); 
            } else if (file.startsWith('testing_')) {
                testImagesPath.push(path.join(folderPath, file)); 
            }
        });

        return { trainImagesPath, testImagesPath };

    } catch (err) {
        console.error('Error reading directory:', err);
        throw err;
    }
}

async function processImage(imagePath) {
    const imageData = await fs.readFile(imagePath);
    const { data, info } = await sharp(imageData)
        .ensureAlpha() // Ensure RGBA format if alpha channel is missing
        .raw() // Output raw pixel data
        .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    const vol = new convnetjs.Vol(width, height, 1, 0.0); // Initialize with zeros

    // Convert RGBA to grayscale and normalize to [0, 1]
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4; // RGBA format
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const grayscale = (r + g + b) / 3 / 255.0; // Convert to grayscale and normalize
            vol.set(x, y, 0, grayscale);
        }
    }
    return vol;
}

async function trainModel() {
    console.log(`Training start: ${getTime()}`);

    try {
        let { trainImagesPath, testImagesPath } = await readImagesFromDirectory(folderPath);
        trainImagesPath = shuffleArray(trainImagesPath);
        testImagesPath = shuffleArray(testImagesPath);
        console.log(`Done getting path - ${getTime()}`);
        // Define the CNN architecture using ConvNetJS
        var layer_defs = [];
        let model_name = '';

        // // LeNet5
        model_name = 'LeNet5-Model.json'
        layer_defs.push({ type: 'input', out_sx: 28, out_sy: 28, out_depth: 1 });
        layer_defs.push({ type: 'conv', sx: 5, filters: 6, stride: 1, pad: 2, activation: 'relu' });
        layer_defs.push({ type: 'pool', sx: 2, stride: 2 });
        layer_defs.push({ type: 'conv', sx: 5, filters: 16, stride: 1, pad: 0, activation: 'relu' });
        layer_defs.push({ type: 'pool', sx: 2, stride: 2 });
        layer_defs.push({ type: 'fc', num_neurons: 120, activation: 'relu' });
        layer_defs.push({ type: 'fc', num_neurons: 84, activation: 'relu' });
        layer_defs.push({ type: 'softmax', num_classes: 10 });

        // // Tester Model
        // model_name = 'Tester-Model.json'
        // layer_defs.push({ type: 'input', out_sx: 28, out_sy: 28, out_depth: 1 });
        // layer_defs.push({ type: 'conv', sx: 5, filters: 8, stride: 1, pad: 2, activation: 'relu' });
        // layer_defs.push({ type: 'pool', sx: 2, stride: 2 });
        // layer_defs.push({ type: 'conv', sx: 5, filters: 16, stride: 1, pad: 2, activation: 'relu' });
        // layer_defs.push({ type: 'pool', sx: 3, stride: 3 });
        // layer_defs.push({ type: 'softmax', num_classes: 10 });

        const net = new convnetjs.Net();
        net.makeLayers(layer_defs);

        const trainer = new convnetjs.SGDTrainer(net, { method: 'adadelta', batch_size: 20, l2_decay: 0.001 });

        // training process
        for (let i = 0; i < trainImagesPath.length; i++) {
            const imagePath = trainImagesPath[i];
            const word = imagePath.split('_')[1];
            const label = labelMapping[word];
            const vol = await processImage(imagePath);

            trainer.train(vol, label);
        }
        console.log(`Done training - ${getTime()}`);
        // testing process
        let correct = 0;
        for (let i = 0; i < testImagesPath.length; i++) {
            const imagePath = testImagesPath[i];
            const word = imagePath.split('_')[1];
            const label = labelMapping[word];
            const vol = await processImage(imagePath);

            const scores = net.forward(vol);
            const predictedLabel = scores.w.indexOf(Math.max(...scores.w));
            if (predictedLabel === label) {
                correct++;
            }
        }
        console.log(`Done testing - ${getTime()}`);
        console.log(correct / testImagesPath.length * 100);

        // save the NET
        var json = net.toJSON();
        var str = JSON.stringify(json);
        // Save the JSON string to a file
        const outputPath = path.join(__dirname, model_name);
        await fs.writeFile(outputPath, str, 'utf8');


        // Further processing logic with trainImagesPath and testImagesPath
    } catch (err) {
        console.error('Error in processImages:', err);
    }
    console.log(`End: ${getTime()}`);

}

function getTime() {
    const now = new Date();

    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    const currentTime = `${hours}:${minutes}:${seconds}`;
    return currentTime;
}

// FIsher-Yate Shuffle Algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

trainModel();
