'use strict'; // http://www.w3schools.com/js/js_strict.asp

// token handling in session
var token = require('./token');

// web framework
var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var zlib = require("zlib");

var forgeSDK = require('forge-apis');

var zipFolder = require('zip-folder');

/////////////////////////////////////////////////////////////////
// Get the list of export file formats supported by the
// Model Derivative API
/////////////////////////////////////////////////////////////////
router.get('/formats', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getFormats({}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (formats) {
            res.json(formats.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Get the manifest of the given file. This will contain
// information about the various formats which are currently
// available for this file
/////////////////////////////////////////////////////////////////
router.get('/manifests/:urn', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getManifest(req.params.urn, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            res.json(data.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

router.delete('/manifests/:urn', function (req, res) {
    var tokenSession = new token(req.session);

    var derivatives = new forgeSDK.DerivativesApi();
    try {
        derivatives.deleteManifest(req.params.urn, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
            .then(function (data) {
                res.json(data.body);
            })
            .catch(function (error) {
                res.status(error.statusCode).end(error.statusMessage);
            });

    } catch (err) {
        res.status(500).end(err.message);
    }
});

/////////////////////////////////////////////////////////////////
// Get the metadata of the given file. This will provide us with
// the guid of the avilable models in the file
/////////////////////////////////////////////////////////////////
router.get('/metadatas/:urn', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getMetadata(req.params.urn, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            res.json(data.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Get the hierarchy information for the model with the given
// guid inside the file with the provided urn
/////////////////////////////////////////////////////////////////
router.get('/hierarchy', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getModelviewMetadata(req.query.urn, req.query.guid, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (metaData) {
            if (metaData.body.data) {
                res.json(metaData.body);
            } else {
                res.json({result: 'accepted'});
            }
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Get the properties for all the components inside the model
// with the given guid and file urn
/////////////////////////////////////////////////////////////////
router.get('/properties', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getModelviewProperties(req.query.urn, req.query.guid, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            res.json(data.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Download the given derivative file, e.g. a STEP or other
// file format which are associated with the model file
/////////////////////////////////////////////////////////////////
router.get('/download', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getDerivativeManifest(req.query.urn, req.query.derUrn, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {

            //Static download b
            var fs = require('fs');
            var fileExt = req.query.fileName.split('.')[1];
            var fileName = req.query.fileName;
            var dataToWrite = ""+data.body;
            //dataToWrite = "" + dataToWrite;
            if (fileExt === "obj") {
                dataToWrite = dataToWrite.replace(/^.*mtllib.*$/mg, "mtllib " + req.query.fileName.split('.')[0] + ".mtl");
            }
            else {
                var filePath = 'Model.zip';
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            fs.writeFile("tmp/" + fileName, dataToWrite, function (err) {
                if (err) {
                    return console.log(err);
                }
                if (fileExt === "obj")
                {
                    zipFolder('tmp', 'Model.zip', function (err) {
                        if (err) {
                            console.log('oh no!', err);
                        }
                        else
                        {
                            
                            console.log('EXCELLENT');
                            var path = require("path");
                            
                            var dir = "tmp";
                            
                            var rmdir = function (dir) {
                                var list = fs.readdirSync(dir);
                                for (var i = 0; i < list.length; i++) {
                                    var filename = path.join(dir, list[i]);
                                    var stat = fs.statSync(filename);

                                    if (filename == "." || filename == "..") {
                                        // pass these files
                                    } else if (stat.isDirectory()) {
                                        // rmdir recursively
                                        rmdir(filename);
                                    } else {
                                        // rm fiilename
                                        console.log("file deletion started");
                                        fs.unlinkSync(filename);
                                    }
                                }
                                //fs.rmdirSync(dir);
                            };
                            rmdir(dir);
                            //res.set('content-type', 'application/octet-stream');
                            //res.set('Content-Disposition', 'attachment; filename="' + req.query.fileName + '"');
                            //var file = '/tmp/' + fileName;
                            //res.download(file);
                            //res.end();

                            //var file = fs.readFile('/zip/Model.zip', 'binary');
                            
                            //res.setHeader('Content-Length', stat.size);
                            res.setHeader('Content-Type', 'zip');
                            res.setHeader('Content-Disposition', 'attachment; filename=Model.zip');
                            //res.write(file, 'binary');
                            res.download('Model.zip');
                            
                            //res.end();
                            //res.end(dataToWrite);
                        }
                    });
                }
                console.log("The file was saved!");
            });
            //end b
            
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Send a translation request in order to get an SVF or other
// file format for our file
/////////////////////////////////////////////////////////////////
router.post('/export', jsonParser, function (req, res) {
    //env, token, urn, format, rootFileName, fileExtType, advanced
    var item = {
        "type": req.body.format
    };

    if (req.body.format === 'svf') {
        item.views = ['2d', '3d'];
    }

    if (req.body.advanced) {
        item.advanced = req.body.advanced;
    }

    var input = (req.body.fileExtType && req.body.fileExtType === 'versions:autodesk.a360:CompositeDesign' ? {
        "urn": req.body.urn,
        "rootFilename": req.body.rootFileName,
        "compressedUrn": true
    } : {"urn": req.body.urn});
    var output = {
        "destination": {
            "region": "us"
        },
        "formats": [item]
    };

    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    if (!derivatives)
        return;

    derivatives.translate({"input": input, "output": output}, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            res.json(data.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Return the router object that contains the endpoints
/////////////////////////////////////////////////////////////////
module.exports = router;