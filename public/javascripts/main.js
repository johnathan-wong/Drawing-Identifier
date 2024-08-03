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
        // Canvas Initialization
        if (window.location.pathname === '/digitdraw') {
            canvasFunctions.setupUserInputs();
        }
        canvasFunctions.setupCanvas();
        CNNModel.initCNNModels();
        // Labels Showing Initialization
        fetch(window.location.pathname + '/labels')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(labels => {
                const tableBody1 = document.querySelector('#labels-table tbody');
                let table2Container = document.querySelector('#labels-table2-container');
                let tableBody2 = document.querySelector('#labels-table2 tbody');
                const gridContainer = document.querySelector('.grid-container');

                const splitIndex = 10;

                // Clear existing rows in both tables
                tableBody1.innerHTML = '';
                if (tableBody2) {
                    tableBody2.innerHTML = '';
                }

                // Create and populate rows for the first table
                labels.slice(0, splitIndex).forEach(label => {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.textContent = label;
                    console.log(label);
                    row.appendChild(cell);
                    tableBody1.appendChild(row);
                });

                // Create and populate rows for the second table if needed
                if (labels.length > splitIndex) {
                    if (!table2Container) {
                        // Create and append the second table if it does not exist
                        const newTable2Container = document.createElement('div');
                        newTable2Container.id = 'labels-table2-container';
                        newTable2Container.className = 'table-container'; // Ensure styling for containers
                        const newTable2 = document.createElement('table');
                        newTable2.id = 'labels-table2';
                        newTable2.className = 'table table-bordered';
                        newTable2.innerHTML = `
                                            <thead>
                                                <tr>
                                                    <th> - </th>
                                                </tr>
                                            </thead>
                                            <tbody></tbody>
                                        `;
                        newTable2Container.appendChild(newTable2);
                        document.querySelector('.grid-container').appendChild(newTable2Container);
                        // Update tableBody2 reference
                        tableBody2 = newTable2.querySelector('tbody');
                    }

                    // Populate the second table
                    labels.slice(splitIndex).forEach(label => {
                        console.log(label);
                        const row = document.createElement('tr');
                        const cell = document.createElement('td');
                        cell.textContent = label;
                        row.appendChild(cell);
                        tableBody2.appendChild(row);
                    });
                    // Apply grid layout with two columns
                    gridContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
                } else if (table2Container) {
                    // Remove the second table if it exists and labels are fewer than or equal to splitIndex
                    table2Container.remove();
                }
            })
            .catch(error => console.error('Error fetching labels:', error));
    }
});