import { createImageFromData } from './canvas.js';

// Initiate CNN
export async function initCNNModels() {
    varSetUp();
    await loadPreTrainedModel();
    await trainModel();
}


// Pre-Trained 
export async function loadPreTrainedModel() {
    // Load Pre-Trained Models from Server At Start
    await fetch('/models')
        .then(response => response.json())
        .then(models => {
            // Access each model individually
            const model1 = models.model1;
            const model2 = models.model2;
            const model3 = models.model3;

            // Store the models for later use
            window.training.models = { model1, model2, model3 };
        })
        .catch(error => {
            console.error('Error fetching models:', error);
        });
    window.curModel = window.training.models.model1;
}

function varSetUp() {
    window.training = {
        net: null,
        models: {},
        training_step: 0,
        training_pause: true,
        training_id: null
        // Add any other properties you need
    };
}

// User Train
export async function trainModel(isResume = false) {

    // // initial Start
    if (window.training.training_pause) {
        window.training.training_pause = false;
    }

    let userNet = null;
    let userTrainer = null;

    if (isResume) {
        userNet = window.training.net;
        userTrainer = window.training.trainer;
    } else {
        const result = await getUserNetwork() || {};
        userNet = result.net || null;
        userTrainer = result.trainer || null;
    }

    if (userNet == null || userTrainer == null) {
        // Escape due to Error on User's Code
        return;
    } else {
        window.training.net = userNet;
        window.training.trainer = userTrainer;
    }

    const pauseFlag = await trainInBatches(window.training.training_step, 50000, 20, userTrainer, window.training.training_id);
    if (pauseFlag) {
        // reset training var
        window.training.training_id = null;
    }
}

async function getUserNetwork() {
    const textarea = document.getElementById("code");
    const editor = textarea.editor;
    const code = editor.getValue();

    try {
        var layer_defs, net, trainer;
        eval(code);
        if (typeof net === 'undefined' || typeof trainer === 'undefined') {
            throw new Error('Network or Traineris undefined.')
        }
        if (!(net instanceof window.convnetjs['Net'])) {
            throw new Error(`net is not the correct class`);
        }
        if (!(trainer instanceof window.convnetjs['SGDTrainer']) && !(trainer instanceof window.convnetjs['Trainer'])) {
            throw new Error(`trainer is not the correct class`);
        }
        return { net: net, trainer: trainer };
    } catch (error) {
        alert(error);
        return null;
    }

}

async function trainInBatches(step, totalImages, batchSize, trainer, id) {
    for (let index = step; index < totalImages; index += batchSize) {
        // Exit For Loop
        if (id != window.training.training_id) {
            break;
        }

        // Visualizer Div Block
        const visualizerBlock = document.getElementById("model-visualizer");


        if (!window.training.training_pause) {
            const images = await loadImages('train', index, batchSize);
            const vols = await imageToVol(images);
            const labels = await loadLabels('train', index, batchSize);

            for (let i = 0; i < batchSize; i++) {
                // const prediction = trainer.net.forward(images[i]);
                // trainer.net.backward();
                trainer.train(vols[i], labels[i]);
            }
            console.log(`DEBUG: Trained (${index + 1} / ${totalImages})`);

            // Display Prediction on Test Set
            const testTotalImages = 3000;
            const testSize = 100;
            const displaySamples = 20;
            const pickedIndices = getRandomIndices(0, testSize, displaySamples);



            const { Images: testImages, labels: testLabels } = await testSet(testTotalImages, testSize);
            const testVols = await imageToVol(testImages);


            // Accuracy Checker
            visualizerBlock.innerHTML = '';
            let correct = 0;
            for (let i = 0; i < testImages.length; i++) {
                const testScores = trainer.net.forward(testVols[i]).w;
                const predictedLabel = testScores.indexOf(Math.max(...testScores));
                if (predictedLabel === testLabels[i]) {
                    correct++;
                }

                // Display Random Sample
                if (pickedIndices.includes(i)) {
                    var length = testScores.length;
                    var indices = new Array(length);
                    for (var j = 0; j < length; j++) indices[j] = j;
                    indices.sort(function (a, b) { return testScores[a] < testScores[b] ? 1 : testScores[a] > testScores[b] ? -1 : 0 });

                    const imageData = testImages[i].data.data;
                    const imageInfo = testImages[i].info;

                    const width = imageInfo.width;
                    const height = imageInfo.height;
                    const channels = imageInfo.channels;

                    // Add Elements to Webpage
                    const layerDiv = document.createElement('div');
                    const imageCanvas = document.createElement('canvas');
                    imageCanvas.width = width;
                    imageCanvas.height = height;
                    const ctx = imageCanvas.getContext('2d');
                    const inputImageData = ctx.createImageData(width, height);
                    inputImageData.data.set(imageData);
                    ctx.putImageData(inputImageData, 0, 0);
                    layerDiv.appendChild(imageCanvas);

                    // Print class and value
                    for (let j = 0; j < Math.min(3, testScores.length); j++) {
                        const index = indices[j];
                        const score = testScores[index];
                        const info = document.createElement('h6');
                        info.innerText = `Top ${j + 1} - Score ${score} at index ${index}`
                        layerDiv.appendChild(info);
                    }
                    visualizerBlock.appendChild(layerDiv);
                }


            }
            console.log(`Accuracy: ${(correct / testSize) * 100}%`);
        } else {
            // Pausing train
            window.training.training_step = index;
            return true;
        }


    }
    return false;

}

async function testSet(totalTest, size) {
    // Add Randomness to make it interesting
    const max = totalTest - size;
    const index = Math.floor(Math.random() * max);

    const testImages = await loadImages('test', index, size);
    const testLabels = await loadLabels('test', index, size);

    return { Images: testImages, labels: testLabels };
}

async function loadImages(type, index, batchSize) {
    const images = [];
    for (let i = index; i < index + batchSize; i++) {
        // Get image data from server
        const url = `/data/images/${type}_img_${i}.png`;
        // NEW
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        images.push(data);
    }
    return images;
}

async function loadLabels(type, index, batchSize) {
    const data = await fetch(`/data/${type}/${index}/${batchSize}`);
    const labels = await data.json();
    return labels;
}

function imageToVol(datas) {
    const vols = [];
    datas.forEach(data => {
        const imageData = data.data.data;
        const imageInfo = data.info;

        const width = imageInfo.width;
        const height = imageInfo.height;

        const vol = new convnetjs.Vol(width, height, 1, 0.0); // Initialize with zeros

        // Convert RGBA to grayscale and normalize to [0, 1]
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4; // RGBA format
                const r = imageData[index];
                const g = imageData[index + 1];
                const b = imageData[index + 2];
                const grayscale = (r + g + b) / 3 / 255.0; // Convert to grayscale and normalize
                vol.set(x, y, 0, grayscale);
            }
        }
        vols.push(vol);
    });
    return vols;
}

function getRandomIndices(min, max, count) {
    if (max - min + 1 < count) {
        throw new Error("Range is too small to generate the required number of unique indices.");
    }

    // Create an array with all possible indices
    const indices = [];
    for (let i = min; i <= max; i++) {
        indices.push(i);
    }

    // Shuffle the array
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Select the first 'count' elements
    return indices.slice(0, count);
}

function cloneNetwork(net) {
    const json = net.toJSON();
    var clonedNet = new convnetjs.Net()
    clonedNet.fromJSON(json);
    return clonedNet;
}


// User Buttons

export function pauseTraining(event) {
    const button = event.target;

    button.classList.remove("pause-train")
    button.classList.add("resume-train")
    button.innerText = 'Resume Training';

    window.training.training_pause = true;
}

export function resumeTraining(event) {
    const button = event.target;

    button.classList.remove("resume-train")
    button.classList.add("pause-train")
    button.innerText = 'Pause Training';

    trainModel(true);
}

export function saveTraining(event) {
    window.training.models.model4 = cloneNetwork(window.training.net);

    const button = document.getElementsByClassName('user-model')[0];
    button.disabled = false;
}

export function changeModel(event) {
    const button = event.target;
    const modelKey = button.getAttribute('data-model');
    window.curModel = window.training.models[modelKey];

}


// visualize
export function visualizeNetwork(net, input) {

    var prob = net.forward(input);

    // Clear previous visualization
    d3.select("#network-visualization").selectAll("*").remove();

    // Visualize activations
    var layers = net.layers;
    layers.forEach(function (layer, i) {
        var layerDiv = d3.select("#network-visualization").append("div").attr("class", "layer");
        layerDiv.append("h3").text("Layer " + i);

        if (layer.out_act) {
            var act = layer.out_act.w;
            var w = Math.sqrt(act.length / layer.out_depth);
            for (var d = 0; d < layer.out_depth; d++) {
                for (var j = 0; j < w * w; j++) {
                    var color = d3.interpolateRdBu((act[d * w * w + j] + 1) / 2);
                    layerDiv.append("div")
                        .style("padding", "0")
                        .style("width", "10px")
                        .style("height", "10px")
                        .style("display", "inline-block")
                        .style("background-color", color);
                    if ((j + 1) % w === 0) layerDiv.append("br");
                }
                layerDiv.append("br");
            }
        }
    });
}