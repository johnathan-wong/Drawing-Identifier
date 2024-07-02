const express = require('express')
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const router = express.Router()





router.get('/', async (req, res) => {
    res.render('index')
})


module.exports = router