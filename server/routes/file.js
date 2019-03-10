const express = require('express')
const router = express.Router()
const ObjectID = require('mongodb').ObjectID

module.exports = function(options) {

    const //orm = require ("../libs/orm_mongo")(options),
        {createServiceSAS} = require ("../libs/orm_azblob")

    /* ------------------------------------- FILE HANDLING
    *
    */
   const returnJsonError = (res, strerr) => {
        console.log ("returnJsonError : " + strerr)
        return res.status(400).send({error: strerr})
    }

    router.put("/file/new", (req,res) => {
        const userdoc = req.body

        if (!userdoc || !userdoc.filename)
            return returnJsonError(res, `No filename provided`);

        if (!req.user)
            return returnJsonError(res, `Permission Denied`);

        const fileprefix = encodeURIComponent(userdoc.filename.substring(userdoc.filename.lastIndexOf(".")))
        const filename = (req.user? req.user._id.toString(): "anonymous") + '/' + (new ObjectID ()).toString() + fileprefix
        const retsas = createServiceSAS (process.env.STORAGE_SIGN_KEY, process.env.STORAGE_ACC, process.env.STORAGE_CONTAINER, 10, filename)
        res.json(Object.assign({filename}, retsas))
    })
    
    router.get('/file/list', function (req,res) {
        /*
        orm.listfiles( function success(j) {
            res.json(j);
        }, (e) => {
            return returnJsonError(res,  e)
        });
        */
    })

    /* UNIX COMMAND
    mongofiles -d myapp_dev list
    mongofiles -d myapp_dev get profile-pic511a7c150c62fde30f000003
    */
    router.get('/file/:filename', function (req,res) {
        /*
        var filename = req.params["filename"];
        orm.getfile (filename, res);
        */
    });

    // upload file into mongo, with help from formidable
    router.put ('/file/:filename', function(req,res) {
        var filename = req.params["filename"];
        console.log (`----------------  /file/${filename}:  user: ${JSON.stringify(req.user)}`);

        if (!req.user) {
            return returnJsonError(res,  "Permission Denied")
        } else {
            /*
            orm.putfile(req, res, filename)
            */
        }
    })

    return router
};

