require('dotenv').config();

const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const methodOverride = require('method-override')
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const util = require('util');

const app = express()

const indexRouter = require('./routes/index')
const digitDrawRouter = require('./routes/digit-draw')
const quickDrawRouter = require('./routes/quick-draw')


app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout', 'layouts/layout')
app.use(expressLayouts)
app.use(methodOverride('_method'))
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 


app.use('/', indexRouter) 
app.use('/digitdraw', digitDrawRouter) 
app.use('/quickdraw', quickDrawRouter) 


app.listen(process.env.PORT || 3000)