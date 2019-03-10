//import orm_mongo from "../libs/orm_mongo.mjs"

const express = require('express'),
      router = express.Router(),
      {findForm, MetaFormsById, MetaFormIds, AdminApp} = require('../libs/orm_mongo_meta'),
      {createServiceSAS} = require ("../libs/orm_azblob"),
      orm_mongo = require ("../libs/orm_mongo.js"),
      orm_sfdc = require ("../libs/orm_sfdc")
/*
 * Express Routes
 */
// node variables are file scoped, not block scoped like java (declaring a variable in a loop block makes it avaiable for the whole file
// to scope to a function, create a anonoumous function (function(){ ... })()

module.exports = function(options) {

  const {find, save, remove} = orm_mongo(options)
  console.log ('setting up dform routes ')

  function queryURLtoJSON (urlquery) {
    if (!urlquery)
      return;

    let jsonQuery = {};
    if (urlquery.d) {
      if (urlquery.d.match(/^(primary|list|all|all_no_system)$/)) {
        jsonQuery.display = urlquery.d
      } else  {
        return jsonQuery = {error: `no valid display option provided (primary|list|all|all_no_system)`}
      }
    }

    if (urlquery._id)
      jsonQuery._id = urlquery._id.indexOf(",") > -1 ? urlquery._id.split(",") : urlquery._id;
    else if (urlquery.p)
      jsonQuery.p = urlquery.p;
    else if (urlquery.q) try {
      jsonQuery.q = JSON.parse(urlquery.q);
    } catch (e) {
      jsonQuery = {error: `cannot parse request : ${urlquery.q}`};
    }
    return jsonQuery;
  }

  async function reqParams2Formdef(form_id, parent, context) {
    console.log (`reqParams2Formdef()`)
    if (!form_id) {
      return {error: `no form parameter provided`}
    } else {
      let form = findForm(form_id, context)
      if (!form && context.app && context.app._id === "admin") {
        console.log(`reqParams2Formdef: form_id not in context, but its the admin app, so may be doing a inline data edit of a new form definition, try get form definition`)
        try {
          form = await find({form: MetaFormsById[String(MetaFormIds.formMetadata)]}, {_id: String(form_id)}, context)
        } catch (e) {
          return {error: `form_id not in context & failed to retreive it :${JSON.stringify(e)}`}
        }
        console.log(`reqParams2Formdef: gotit : ${form.name} - ${form.store}`)
      } 
      if (!form) {
          return {error: `Form definition not found :${form_id}`}
      } else {
        console.log (`reqParams2Formdef() [form: ${form.name}]`)
        let ret = {form: form, store: form.store}
        if (!parent) {
          if (form.store === "fromparent") {
            return {error: `Childform, but no parent information supplied :${form.name}`}
          } else {
            return ret
          }
        } else {
          if (form.store !== "fromparent") {
            return {error: `Not a childform, but parent information supplied :${form.name}`}
          } else {
            try {
              let p = JSON.parse(parent);
              if (!p.record_id || !p.form_id || !p.field_id) {
                return {error: `cannot parse parent, missing [record_id|form_id|field_id] : ${parent}`};
              }
              let pform = findForm(p.form_id, context)
              if (!pform) {
                return {error: `Parent form definition not found :${p.form_id}`}
              } else {
                let pform_fld = pform.fields.find((d) =>  String(d._id) === String (p.field_id))
                if (!pform_fld) {
                  return {error: `Parent field definition not found :${p.field_id}`}
                } else {

                  if (!(pform_fld.child_form && String(pform_fld.child_form._id) === String(form._id))) {
                    return {error: `childform not assosiated to parent (check your schema child_form): ${pform_fld.name}`}
                  } else {
                    ret.store = pform.store
                    ret.parent = {form: pform, field: pform_fld, query: {_id: p.record_id}}
                    return ret
                  }
                }
              }
            } catch (e) {
              return {error: `Cannot parse parent : ${parent}`}
            }
          }
        }
      }
    }
  }

 /*
    $.content[0].m:properties[0].d:Id[0]
    $.content[0].m:properties[0].d:Name[0]
    $.content[0].m:properties[0].d:Uri[0]
    $.content[0].m:properties[0].d:StorageAccountName[0]

    /xmlns:feed/xmlns:entry

    string(./xmlns:content/m:properties/d:Id)
    string(./xmlns:id)
    string(./xmlns:content/m:properties/d:Name)
    string(./xmlns:content/m:properties/d:Uri)
*/
/*
  var validate_store_xml_result = (form, store_data, single) => {
    //console.log (`validate_store_result:  ${store_data}`)
    let doc = new dom().parseFromString(store_data),
        select = xpath.useNamespaces({ 'xmlns': 'http://www.w3.org/2005/Atom', d: "http://schemas.microsoft.com/ado/2007/08/dataservices", m: "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" }),
        entries = single ? select("/xmlns:entry", doc) : select("/xmlns:feed/xmlns:entry", doc)

    let res = []
    for (let row of entries) {
      let r = {_id: select(form.externalid, row)}
      for (let fld of form.fields) {
        r[fld.name] = select(fld.source, row)
      }
      res.push(r)
    }
    return single ? res[0] : res
  }
*/
  function returnJsonError (res, strerr) {
    console.log ("returnJsonError : " + strerr)
    return res.status(400).send({error: strerr})
  }

  function validate_store_json_result (form, store_data, query, context) {
    //console.log (`validate_store_json_result: [${form.name}]: ${JSON.stringify(store_data)}`)
    let entries = (query && query._id) ? [store_data] : store_data

    let jsonpath = (path, json) => {
       let r = json[path[0]]
       if (path.length >1) { return jsonpath(path.slice(1), r) } else { return r }
    }

    let res = entries.map((row,i) => {
      let r = {_id: row[form.externalid]}
      if (row._saslocator) r._saslocator = row._saslocator

      for (let fld of form.fields.filter(f => query.display === "all" || (query.display === "list" && f.display === "list") || f.display === "primary")) {
        if (fld.type === 'childform' && row[fld.name]) {
          let childform = fld.child_form && findForm(fld.child_form._id, context)
          r[fld.name] = validate_store_json_result (childform, row[fld.name], {display: "all"} , context)
        } else {
          if (!fld.source) {
            r[fld.name] = row[fld.name] == null ? null : row[fld.name].toString()
          } else {
            r[fld.name] = jsonpath(fld.source.split("."), row)
          }
        }
      }
      return r
    })
    return (query && query._id) ? res[0] : res
  }

//--------------------------------------------------------- FIND
  router.get('/db/:form', async function (req, res) {
    const formparam = req.params["form"],
          query = queryURLtoJSON(req.query)
    
    console.log (`get /db/:${formparam}, query: [${JSON.stringify(query)}].  [context:]`)
    
    try {

       const context = await getAppForms(req.session.context.app, req.user),
             formdef = await reqParams2Formdef (formparam, null, context)

      if (formdef.error) {
        return returnJsonError(res, `Form definition not found :${formdef.error}`)
      } else if (query && query.error) {
          return returnJsonError(res, query.error)
      } else if (formdef.store === "metadata") {
        return returnJsonError(res, `Form definition is metadata, find on client :${formparam}`)
      } else if (formdef.store === "mongo") {
        // TODO - implement a mongo childform find
        console.log (`get /db/form - form: ${formdef.form.name}, ultimate store: ${formdef.store}, query: [${JSON.stringify(query)}].  [context:]`)
        res.json(await find(formdef, query, context))

      } /* else if (formdef.store === "ams_api") {

        orm_ams.find (formdef, query, context).then((j) => {
          res.json(validate_store_json_result (formdef.form, j, query, context)); 
        }, (e) => {
          return returnJsonError(res, e)
        }).catch((e)=> {
          return returnJsonError(res, e)
        })
      }*/ else if (formdef.store === "sfdc") {
        res.json(validate_store_json_result (formdef.form, await orm_sfdc.find (formdef.form, query, context), query, context))
      }else {
        return returnJsonError(res, `unsupported form store ${formdef.store}`)
      }
    } catch (e) {
      return returnJsonError(res, e)
    }
  })

//--------------------------------------------------------- SAVE
  router.post('/db/:form', async function(req, res) {
    const formparam = req.params["form"],
        userdoc = req.body

    console.log (`post /db/:${formparam}`)

    try {
      const context = await getAppForms(req.session.context.app, req.user),
            formdef = await reqParams2Formdef (formparam, req.query.parent, context)

      if (false && !req.user)
        return returnJsonError(res, `Permission Denied`);
      else {
        
        if (formdef.error) {
          return returnJsonError(res, `Form definition not found :${formdef.error}`)
        } else if (formdef.store === "mongo" || formdef.store === "metadata") {  

          console.log (`post /db/:${formdef.form.name}, calling save [context app : ${context && context.app && context.app.name}]`)
          res.json(await save (formdef, userdoc, context))

        } else if (formdef.store === "ams_api") {
          orm_ams.save (formdef, userdoc, context).then((j) => {
            res.json(validate_store_json_result (formdef.form, j, true, context))
          }, (e) => {
            return returnJsonError(res, e)
          }).catch((e) => {
            return returnJsonError(res, e)
          })
        } else {
        return returnJsonError(res, `unsupported form store ${formdef.store}`)
        }
      }
    } catch (e) {
      return returnJsonError(res, e)
    }
  })

  //--------------------------------------------------------- DELETE
  router.delete('/db/:form', async function(req, res) {
    const formparam = req.params["form"],
        query = queryURLtoJSON(req.query)

    console.log (`delete /db/:${formparam}`)

    try {
      const
        context = await getAppForms(req.session.context.app, req.user),
        formdef = await reqParams2Formdef(formparam, req.query.parent, context)

      if (!req.user) {
        return returnJsonError(res, `Permission Denied`)
      } else {

        if (formdef.error) {
          return returnJsonError(res, `Form definition not found :${formdef.error}`)
        } else if (query && query.error) {
            return returnJsonError(res, query.error)
        } else if (formdef.store === "metadata") {
          return returnJsonError(res, `Form definition is metadata, delete on client :${formparam}`)
        } else if (formdef.store === "mongo") {
            res.json(await remove (formdef, query, context))
        } else if (formdef.store === "ams_api") {

          orm_ams.delete (formdef, query, context).then((j) => {
              res.json({'deleted': true})
            }, (e) => {
              return returnJsonError(res, e)
            }).catch((e) => {
              return returnJsonError(res, e)
            })
        } else {
          return returnJsonError(res, `unsupported form store ${formdef.store}`)
        }
      }
    } catch (e) {
      return returnJsonError(res, e)
    }
  })

  // reinflate the session context
  async function getAppForms(apporappid, req_user, reinflate = true) {
    console.log (`getAppForms(): re-inflate application forms into 'context' [appid: ${apporappid && apporappid._id}]`)
    let app = apporappid,
        ret = {}

    if (reinflate) {
      ret.user = req_user
    }

    if (reinflate && app && app._id) {
      if (app._id === String(AdminApp._id)) {
        app = AdminApp
        ret.app = AdminApp
      } else {
        console.log (`getAppForms() load app ${apporappid._id}`)
        app = await find({form: MetaFormsById[MetaFormIds.App]}, { _id: app._id})
        ret.app = app
      }
    }

    if (app && app.appperms && app.appperms.length >0) {
      if (app._id === String(AdminApp._id)) {
         ret.appMeta = app.appperms.map(appperm => MetaFormsById[String(appperm.form._id)])
      } else {
        const app_formids = app.appperms.map(appperm => appperm.form._id)
        console.log (`getAppForms() load forms`)
        ret.appMeta =  await find({form : MetaFormsById[String(MetaFormIds.formMetadata)]}, {_id: app_formids})
      }
    } 
    console.log (`getAppForms(): finished`)
    return ret
  }
  /* ------------------------------------- BOOT THE APP
   *
   */
  router.get('/loadApp', async function(req, res) {
    let urlappid = req.query["appid"],
        sendtoclient = {}

    console.log (`/loadApp: [requested urlappid: ${urlappid}] [user: ${req.user ? req.user.name : 'none'}]`);

    try {
      // Calculate appid
      if (req.user) {

        sendtoclient.user = Object.assign({},req.user)

        console.log (`/loadApp: logged in user ${req.user.name}`)
        if (req.user.role === "admin") {
          console.log (`/loadApp: user is a admin, add the AdinApp to their apps list`)
          if (!sendtoclient.user.apps) sendtoclient.user.apps = []
          sendtoclient.user.apps.push({app: AdminApp});
        }
        

        let requestedappid = undefined
        // if no urlappid specified, get the default appid from the user apps, or if the user is admin, get Admin app
        if (!urlappid) {
          console.log (`/loadApp: no app requested, find a default app that user has access to, if no default, get admin app`)
          let userapp = sendtoclient.user.apps.find(ua => ua.defaultapp)
          requestedappid = userapp ? userapp.app._id : (req.user.role === "admin" ? AdminApp._id : null)

        } else {
          console.log (`/loadApp: specific app requested, insure user has permission to access the app`)
          let userapp = sendtoclient.user.apps.find(ua => String(ua.app._id) === urlappid)
          if (!userapp) {
            return returnJsonError(res, `App requested not available : ${urlappid}`)
          }
          requestedappid = userapp.app._id
        }
        if (requestedappid === AdminApp._id) {
          sendtoclient.app = AdminApp
        } else {
          const app = await find({form: MetaFormsById[MetaFormIds.App]}, { _id: requestedappid})
          if (app) {
            sendtoclient.app = app
          }
        }
      } else {
        // not logged on, so must return public app
        let query = {"public_access": true}
        if (urlappid) {
          if (urlappid === AdminApp._id) {
            return returnJsonError(res, `App requested not available : ${urlappid}`)
          } else {
            query._id = urlappid
          }
        }

        // app requested, so provide it.
        const app = await find({form: MetaFormsById[MetaFormIds.App]}, { q: query})
        if (app && app.length>0) {
          sendtoclient.app = app[0]
        } else if (urlappid) {
          return returnJsonError(res, `App requested not available : ${urlappid}`)
        }
      }
      // Genreate Attachment SAS
      sendtoclient.readSAS = createServiceSAS(process.env.STORAGE_SIGN_KEY, process.env.STORAGE_ACC, process.env.STORAGE_CONTAINER, 60) 
      
      // get app forms 
      const context = await getAppForms(sendtoclient.app, undefined, false)
      if (context.appMeta) {
        if (sendtoclient.app._id !== String(AdminApp._id)) {
          context.appMeta.push(MetaFormsById[String(MetaFormIds.iconSearch)]); // non-admin apps that need to work with icons
          context.appMeta.push(MetaFormsById[String(MetaFormIds.FormFieldMetadata)]); // required for dynamic fields
          context.appMeta.push(MetaFormsById[String(MetaFormIds.DropDownOption)]); // Apps with forms with dropdown fields

          //context.appMeta.push(MetaFormsById[String(MetaFormIds.App)]); // apps that need to work with users app-specific dynamic fields
          //systemMeta.push(MetaFormsById[String(MetaFormIds.FileMeta)]); // apps that need to work with files
          //systemMeta.push(MetaFormsById[String(MetaFormIds.iconSearch)]); // apps that need to work with icons
          //systemMeta.push(MetaFormsById[String(MetaFormIds.Users)]); // apps that need to work with users
          //systemMeta.push(MetaFormsById[String(MetaFormIds.AuthProviders)]); // apps that need to work user auth providers
          //systemMeta.push(MetaFormsById[String(MetaFormIds.ComponentMetadata)]); // needed for the router props
          //systemMeta.push(MetaFormsById[String(MetaFormIds.formMetadata)]); // required for the cloneSObject jexl Transform
          

        }
        sendtoclient.appMeta = context.appMeta
      }

      if (sendtoclient.app) {
        req.session.context = { app: {_id: sendtoclient.app._id}}
      }

      res.json(sendtoclient)

    } catch (e) {
      return returnJsonError(res, `App requested not available: ${urlappid} [${e}]`)
    }
  })

  return router
}
