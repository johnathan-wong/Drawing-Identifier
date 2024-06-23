
// Initiate CNN
export async function initCNNModels() {
    varSetUp();
    await loadPreTrainedModel();
    await trainModel();
}


// Pre-Trained 
export async function loadPreTrainedModel() {
    // Load Pre-Trained Models from Server At Start
    fetch('/models')
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

    let { net: userNet = null, trainer: userTrainer = null } = await getUserNetwork() || {};

    if (userNet == null || userTrainer == null) {
        // Escape due to Error on User's Code
        return;
    } else {
        window.training.net = userNet;
        userTrainer.net = window.training.net;
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
        if (!window.training.training_pause) {
            const imagesDatas = await loadImages('train', index, batchSize);
            const imagesVols = await imageToVol(imagesDatas);
            const labels = await loadLabels('train', index, batchSize);

            for (let i = 0; i < batchSize; i++) {
                // const prediction = trainer.net.forward(images[i]);
                // trainer.net.backward();
                trainer.train(imagesVols[i], labels[i]);
            }
            console.log(`DEBUG: Trained (${index + 1} / ${totalImages})`);
            
            // TODO: Display Prediction on Test Set
            const testTotalImages = 3000;
            const testSize = 100;
            const displaySamples = 1;
            const pickedIndices = getRandomIndices(0, testSize, displaySamples);

            const { Images: testImages, labels: testLabels } = await testSet(testTotalImages, testSize);


            // Accuracy Checker
            let correct = 0;
            for (let i = 0; i < testImages.length; i++) {
                const testScores = trainer.net.forward(testImages[i]);
                const predictedLabel = testScores.w.indexOf(Math.max(...testScores.w));
                if (predictedLabel === testLabels[i]) {
                    correct++;
                }

                // 
                if (pickedIndices.includes(i)) {
                    var length = testScores.length;
                    var indices = new Array(length);
                    for (var j = 0; j < length; j++) indices[j] = j;
                    indices.sort(function (a, b) { return scores[a] < scores[b] ? 1 : scores[a] > scores[b] ? -1 : 0 });

                    // DEBUG: - Print class and value
                    for (let j = 0; j < Math.min(3, testScores.length); j++) {
                        const index = indices[j];
                        const score = scores[index];
                        console.log(`DEBUG: Top ${j + 1} - Score ${score} at index ${index}`);
                    }
                }


            }
            console.log(`Accuracy: ${(correct / 100) * 100}%`);
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