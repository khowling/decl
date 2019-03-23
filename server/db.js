const USE_COSMOS = true
const url = require('url')
const MongoClient = require('mongodb').MongoClient
const MongoURL = process.env.MONGO_DB || "mongodb://localhost:27017/mydb01"

const {MetaFormsArray} = require('./libs/orm_mongo_meta')

let _db, _dbname

async function create_cosmos_collections (db, dbname) {
    
    for (let mc of MetaFormsArray.filter ((fm) => fm.store === "mongo")) {
        console.log (`creating cosmos ${mc.name} -  ${dbname}.${mc.collection}`)
        try { 
            await db.command({ shardCollection: `${dbname}.${mc.collection}`, key: { partition_key:  "hashed" }})
        } catch (err) {
            // allow gracefull error, as this will throw if collection already exists!
            //console.log (err)
        }
    }
}

function getDb() {
    if (!_db || !_dbname) throw ("Database not initialised")
    return {db: _db, dbname: _dbname}
}

async function dbInit() {

    const client = await MongoClient.connect(MongoURL, { useNewUrlParser: true })
  
    //if (err) throw err;
    //console.log(`connected to mongo (error: ${err})`)

    _dbname = url.parse(MongoURL).pathname.substr(1)
    _db = client.db(_dbname)

    // The keyword await makes JavaScript wait until that promise settles and returns its result.
    if (USE_COSMOS) {
        console.log (`ensuring collections are created`)
        // session
        try { 
            // create all MetaData collections
            await create_cosmos_collections(_db, _dbname)

            // create session collection
            await _db.command({ shardCollection: `${_dbname}.session`, key: { partition_key:  "hashed" }})
        } catch (err) {
            console.error (err)
            // allow gracefull error, as this will throw if collection already exists!
            //process.exit(1)
        }
    }

    return _db
}

module.exports = {
    USE_COSMOS, dbInit, getDb
}