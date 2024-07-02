const convnetjs = require('convnetjs');
const fs = require('fs').promises;
const sharp = require('sharp');
const path = require('path');

// Define the CNN architecture using ConvNetJS
var layer_defs = [];
layer_defs.push({type:'input', out_sx:28, out_sy:28, out_depth:1});
layer_defs.push({type:'conv', sx:5, filters:16, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:2, stride:2});
layer_defs.push({type:'conv', sx:5, filters:32, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:3, stride:3});
layer_defs.push({type:'softmax', num_classes:10});

const net = new convnetjs.Net();
net.makeLayers(layer_defs);

const trainer = new convnetjs.SGDTrainer(net, { method: 'adadelta', batch_size: 20, l2_decay: 0.001 });

async function trainModel(totalImages) {
    const labelPath = path.join(__dirname, '../data/mnist_images', `train_labels.json`);
    const labelData = await fs.readFile(labelPath, 'utf8');
    const labels = JSON.parse(labelData);

    for (let i = 0; i < totalImages; i++) {
        const imagePath = path.join(__dirname, '../data/mnist_images', `train_img_${i}.png`);
        const imageBuffer = await fs.readFile(imagePath);
        const label = labels[i];

        // Decode image using sharp
        const { data, info } = await sharp(imageBuffer)
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
        trainer.train(vol, label);
    }

    const number_test = 3000;
    const testLabelPath = path.join(__dirname, '../data/mnist_images', `test_labels.json`);
    const testLabelData = await fs.readFile(testLabelPath, 'utf8');
    const testLabels = JSON.parse(testLabelData);
    let correct = 0;

    for (let i = 0; i < number_test; i++) {
        const testImagePath = path.join(__dirname, '../data/mnist_images', `test_img_${i}.png`);
        const testImageBuffer = await fs.readFile(testImagePath);
        const testLabel = testLabels[i];

        const { data, info } = await sharp(testImageBuffer)
            .ensureAlpha() // Ensure RGBA format if alpha channel is missing
            .raw() // Output raw pixel data
            .toBuffer({ resolveWithObject: true });

        const testVol = new convnetjs.Vol(info.width, info.height, 1, 0.0); // Initialize with zeros

        for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
                const index = (y * info.width + x) * 4; // RGBA format
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const grayscale = (r + g + b) / 3 / 255.0; // Convert to grayscale and normalize
                testVol.set(x, y, 0, grayscale);
            }
        }
        

        const scores = net.forward(testVol);
        const predictedLabel = scores.w.indexOf(Math.max(...scores.w));
        if (predictedLabel === testLabel) {
            correct++;
        }
    }
    console.log(`Accuracy: ${(correct / number_test) * 100}%`);
}

trainModel(50000).then(async () => {
    console.log('Training complete');
    // network outputs all of its parameters into json object
    var json = net.toJSON();
    var str = JSON.stringify(json);
    // Save the JSON string to a file
    const outputPath = path.join(__dirname, '50k-trained_model.json');
    await fs.writeFile(outputPath, str, 'utf8');
}).catch(err => {
    console.error('Error during training:', err);
});
