  const 
    { MetaFormsById, MetaFormIds, AdminApp} = require('./orm_mongo_meta'),
    {find, save, remove} = require ("../libs/orm_mongo.js")

  // reinflate the session context - **context needs to be immutable**
  async function inflateContext(req_ctx, req_user) {
    const req_ctx_appid = req_ctx && req_ctx.app && req_ctx.app._id
    console.log (`inflateContext(): re-inflate application forms into 'context' [appid: ${req_ctx_appid}]`)

    // set partition_key (required!)
    if (typeof req_ctx.partition_key === "undefined") throw ("inflateContext - No partition key")
    let context = {partition_key: req_ctx.partition_key}

    // set user (optional)
    if (req_user) {
      context.user = req_user
    }

    // set app & appMeta (optional)
    if (req_ctx_appid) {
      if (req_ctx_appid === String(AdminApp._id)) {
        if (!req_user || req_user.role !== "admin") {
          return Promise.reject("user not a admin")
        }
        context.app = AdminApp
      } else {
        console.log (`inflateContext() load app ${req_ctx_appid}`)
        context.app = await find({form: MetaFormsById[MetaFormIds.App]}, { _id: req_ctx_appid})
        // TODO - check user is allocated to the app, or its public
      }
    }

    if (context.app) {
      const appforms =  await getAppForms(context.app)
      if (appforms) context.appMeta = appforms
    }

    console.log (`inflateContext(): finished [context.partition_key: ${context.partition_key}]`)
    return context
  }
  
  async function getAppForms(app) {
    if (app && app.appperms && app.appperms.length >0) {
      if (app._id === String(AdminApp._id)) {
         return app.appperms.map(appperm => MetaFormsById[String(appperm.form._id)])
      } else {
        const app_formids = app.appperms.map(appperm => appperm.form._id)
        console.log (`getAppForms() load forms`)
        return await find({form : MetaFormsById[String(MetaFormIds.formMetadata)]}, {_id: app_formids})
      }
    }
    return undefined
  }

  module.exports = {
    getAppForms,
    inflateContext
  }