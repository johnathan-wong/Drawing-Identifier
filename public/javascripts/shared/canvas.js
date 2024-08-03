import { trainModel, visualizeNetwork } from './CNNHandler.js';

// Canvas Functions
export function setupCanvas() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 10;

    let drawing = false;
    let stop = false;

    function getPosition(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        if (event.touches) {
            return {
                x: event.touches[0].clientX - rect.left,
                y: event.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
    }

    function draw(event, ctx, drawing, canvas) {
        if (!drawing) return;
        ctx.lineCap = 'round';
        const pos = getPosition(event, canvas);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    // Mouse Events
    canvas.addEventListener('mousedown', (event) => {
        drawing = true;
        if (window.training.training_pause == true){
            stop = true;
        }
        window.training.training_pause = true;
        const pos = getPosition(event, canvas);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener('mouseup', () => {
        drawing = false;
        if (!stop){
            trainModel(true);
        }
        ctx.beginPath();
    });

    canvas.addEventListener('mousemove', (event) => draw(event, ctx, drawing, canvas));

    // Touch Events
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        drawing = true;
        if (window.training.training_pause == true){
            stop = true;
        }
        window.training.training_pause = true;
        const pos = getPosition(event, canvas);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        draw(event, ctx, drawing, canvas);
    });

    canvas.addEventListener('touchend', (event) => {
        event.preventDefault();
        drawing = false;
        if (!stop){
            trainModel(true);
        }
        ctx.beginPath();
    });
}

function setupVisualizer(){
    const canvas = document.getElementById('nn-visualizer');
}

export function resetCanvas() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    submitCanvas(false);
}

export function submitCanvas(guess = true) {
    const canvas = document.getElementById("canvas");
    const prediction = document.getElementById("prediction");
    const imageData = resizeImage(canvas);
    const grayscaleArray = grayScaleImage(imageData);

    const net = new convnetjs.Net();
    net.fromJSON(window.curModel);

    const vol = new convnetjs.Vol(28, 28, 1, 0.0);
    vol.w = grayscaleArray;

    // visualizeNetwork(net, vol);
    const probabilityVolume = net.forward(vol);
    const scores = probabilityVolume.w;

    let predictedClass = -1;
    let maxScore = -Infinity;
    for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
            maxScore = scores[i];
            predictedClass = i;
        }
    }
    // Print the predicted class
    if (guess){
        prediction.innerText = `${labels[predictedClass]}`;
    }
    
    printInfo(net);

    


    
}

export function createImageFromData(data, width, height, depth) {
    const images = [];

    for (let d = 0; d < depth; d++) {
        // Create a canvas element for each depth slice
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        // Create ImageData object
        const imageData = ctx.createImageData(width, height);

        for (let i = 0; i < width * height; i++) {
            const value = Math.floor((data[i * depth + d] + 1) * 127.5); // Scale to [0, 255]
            imageData.data[i * 4 + 0] = value; // Red
            imageData.data[i * 4 + 1] = value; // Green
            imageData.data[i * 4 + 2] = value; // Blue
            imageData.data[i * 4 + 3] = 255; // Alpha
        }

        // Put ImageData onto the canvas
        ctx.putImageData(imageData, 0, 0);

        if (width < 28 || height < 28) {
            // enlarge
            const enlargedCanvas = document.createElement('canvas');
            enlargedCanvas.width = 28;
            enlargedCanvas.height = 28;
            const temp = enlargedCanvas.getContext('2d');
            temp.drawImage(canvas, 0, 0, 28, 28);
            images.push(enlargedCanvas);
        } else {
            images.push(canvas);
        }

    }

    return images;
}

function resizeImage(canvas) {
    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Set the dimensions to 28x28
    tempCanvas.width = 28;
    tempCanvas.height = 28;

    // Draw the source canvas onto the temporary canvas with resizing
    tempCtx.drawImage(canvas, 0, 0, 28, 28);
    return tempCtx.getImageData(0, 0, 28, 28);
}

function grayScaleImage(imageData) {
    const grayscaleArray = [];
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Get the RGBA values
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Convert to grayscale
        const grayscale = (r + g + b) / 3;

        // Normalize the grayscale value to [0, 1]
        grayscaleArray.push(grayscale / 255);
    }

    return grayscaleArray;
}

function printInfo(net){
    const containerBlock = document.getElementById('detail-block');
    containerBlock.innerHTML = '';
    net.layers.forEach((layer, layerIndex) => {
        // Create a new div element
        const layerDiv = document.createElement('div');

        // Create a new h3 element
        const layerHeading = document.createElement('h3');
        // Set the text content of the h3 element to the layer type
        layerHeading.textContent = `Layer ${layerIndex}: ${layer.layer_type}`;
        // activations
        layerDiv.appendChild(layerHeading);
        if (layer.out_act) {
            const layerActivations = layer.out_act.w;
            const activationImages = createImageFromData(layerActivations, layer.out_sx, layer.out_sy, layer.out_depth);
            activationImages.forEach(activationImage => {
                layerDiv.appendChild(activationImage);
            });
        }
        containerBlock.appendChild(layerDiv);
    });
}

// User Editor

export function setupUserInputs() {
    const textarea = document.getElementById("code");
    const editor = CodeMirror.fromTextArea(textarea, {
        lineNumbers: true,
        mode: "javascript",
        theme: "dracula",
        indentUnit: 4,
        matchBrackets: true
    });
    textarea.editor = editor;
    editor.setSize(null, null); // width is auto, height is 400px
}


// classes
class Pixel {
    constructor(x,y,parent){
        thix.x = x;
        this.y = y;
        this.parent = parent;
    }
    getParent(){
        return this.parent;
    }
}