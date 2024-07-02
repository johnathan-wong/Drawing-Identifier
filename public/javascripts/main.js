import * as headerFunctions from './shared/header.js';
import * as canvasFunctions from './shared/canvas.js';
import * as CNNModel from './shared/CNNHandler.js';

// Header
function handleSidebarButtons(event) {
    // Since target is not a button
    const target = event.target.closest('.sidebar-open, .sidebar-close');
    if (!target) return;

    if (target.classList.contains('sidebar-open')) {
        headerFunctions.showSidebar();
    } else if (target.classList.contains('sidebar-close')) {
        headerFunctions.closeSidebar();
    }
}

// Canvas
function handleCanvasButtons(event) {
    if (event.target.classList.contains('canvas-reset')) {
        canvasFunctions.resetCanvas();
    } else if (event.target.classList.contains('canvas-submit')) {
        canvasFunctions.submitCanvas();
    } else if (event.target.classList.contains('change-model')) {
        CNNModel.changeModel(event);
    }
}

function handleTrainingButtons(event) {
    if (event.target.classList.contains('start-train')) {
        CNNModel.trainModel();
    } else if (event.target.classList.contains('pause-train')) {
        CNNModel.pauseTraining(event);
    } else if (event.target.classList.contains('resume-train')) {
        CNNModel.resumeTraining(event);
    } else if (event.target.classList.contains('save-train')) {
        CNNModel.saveTraining(event);
    }
}

// Button Click listener
document.addEventListener('click', function (event) {
    handleSidebarButtons(event);
    handleCanvasButtons(event);
    handleTrainingButtons(event);
});

// Initialization
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname === '/digitdraw' || window.location.pathname === '/quickdraw') {
        if (window.location.pathname === '/digitdraw'){
            canvasFunctions.setupUserInputs();
        }
        canvasFunctions.setupCanvas();
        CNNModel.initCNNModels();
    }
});