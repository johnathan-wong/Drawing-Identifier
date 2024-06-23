import os
import numpy as np
import gzip
import pickle
import imageio
import json

# Ensure the correct working directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("Current working directory:", os.getcwd())

# Ensure the file exists in the script directory
file_path = 'mnist.pkl.gz'
if not os.path.exists(file_path):
    raise FileNotFoundError(f"No such file: '{file_path}'")

# Load the MNIST dataset from mnist.pkl.gz
with gzip.open(file_path, 'rb') as f:
    train_set, valid_set, test_set = pickle.load(f, encoding='latin1')

# Create a directory to save the images
output_dir = os.path.join(script_dir, 'mnist_images')
os.makedirs(output_dir, exist_ok=True)

# Convert both train and test to png as images
x_train = (train_set[0] * 255).astype(np.uint8).reshape(-1, 28, 28)
x_valid = (valid_set[0] * 255).astype(np.uint8).reshape(-1, 28, 28)
x_test = (test_set[0] * 255).astype(np.uint8).reshape(-1, 28, 28)

# Save training images (50000)
for i, img in enumerate(x_train):
    imageio.imwrite(os.path.join(output_dir, f'train_img_{i}.png'), img)

# # Save validation images (10000)
for i, img in enumerate(x_valid):
    imageio.imwrite(os.path.join(output_dir, f'valid_img_{i}.png'), img)

# # Save test images (3000)
for i, img in enumerate(x_test[:3000]):  # Save the first 3000 test images
    imageio.imwrite(os.path.join(output_dir, f'test_img_{i}.png'), img)

# Save labels for train set
train_labels = train_set[1]
train_labels_file = os.path.join(output_dir, 'train_labels.json')
with open(train_labels_file, 'w') as f:
    json.dump(train_labels.tolist(), f)
print(f"Train labels saved to {train_labels_file}")

# Save labels for validation set
valid_labels = valid_set[1]
valid_labels_file = os.path.join(output_dir, 'valid_labels.json')
with open(valid_labels_file, 'w') as f:
    json.dump(valid_labels.tolist(), f)
print(f"Validation labels saved to {valid_labels_file}")

# Save labels for test set
test_labels = test_set[1]
test_labels_file = os.path.join(output_dir, 'test_labels.json')
with open(test_labels_file, 'w') as f:
    json.dump(test_labels.tolist(), f)
print(f"Test labels saved to {test_labels_file}")

print(f"Processed data saved to {output_dir}")
