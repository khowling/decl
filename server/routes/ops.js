//import orm_mongo from "../libs/orm_mongo.mjs"

const express = require('express'),
      router = express.Router(),
      {MetaFormsArray, MetaFormsById, MetaFormIds, AdminApp} = require('../libs/orm_mongo_meta'),
      {createServiceSAS} = require ("../libs/orm_azblob"),
      orm_mongo = require ("../libs/orm_mongo.js"),
      https = require ("https"),
      orm_sfdc = require ("../libs/orm_sfdc")
/*
 * Express Routes
 */
// node variables are file scoped, not block scoped like java (declaring a variable in a loop block makes it avaiable for the whole file
// to scope to a function, create a anonoumous function (function(){ ... })()

module.exports = function(options) {


  const {find, save, remove} = orm_mongo(options)

    function returnJsonError (res, strerr) {
        console.log ("returnJsonError : " + strerr)
        return res.status(400).send({error: strerr})
    }


    router.put('/op/:operation', async function (req, res) {
        const 
            op = req.params["operation"],
            userdoc = req.body

        if (!userdoc || !userdoc.id)
            return returnJsonError(res, `No App ID provided`)


        const apprec = await find({form: MetaFormsById[MetaFormIds.App]}, { _id: userdoc.id})

        const APPS_CONTAINER = "publishedapps",
              filename = encodeURIComponent(apprec.name)
        const {container_url, sas} = createServiceSAS(process.env.STORAGE_SIGN_KEY, process.env.STORAGE_ACC, APPS_CONTAINER, 60, filename) 


        const post_req = https.request(`${container_url}/${filename}?${sas}`, {
            method: 'PUT',
            headers: {
                "x-ms-version": "2018-03-28",
                "x-ms-blob-type": "BlockBlob",
                "x-ms-blob-content-type": 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(apprec))
            }}, (postres) => {


                if(!(postres.statusCode === 200 || postres.statusCode === 201)) {
                    //console.log (`${res.statusCode} : ${res.statusMessage}`)
                    return res.json({code: postres.statusCode, message: postres.statusMessage})
                }

                let rawData = '';
                postres.on('data', (chunk) => {
                    //console.log (`list_things got data ${chunk}`)
                    rawData += chunk
                })

                postres.on('end', () => {
                    //console.log (`list_things got end ${rawData}`)
                    return res.json(rawData)

                })

                
            }).on('error', (e) =>  res.json({code: 'error', message: e}));
        post_req.write(JSON.stringify(apprec))
        post_req.end()
    })





    return router
}
