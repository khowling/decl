//    https://nodejs.org/api/esm.html#esm_enabling
//    The --experimental-modules flag can be used to enable features for loading ESM modules
const  ObjectID = require('mongodb').ObjectID,
       jexl = require('jexl'),
       {findForm, findFormByName, MetaFormsById, MetaFormIds} = require('./orm_mongo_meta'),
       {getDb} = require ('../db.js')



var {db, dbname} = getDb()
const FORM_METADATA_ID = "303030303030303030313030"

var _formControlState
import('../../src/shared/dform.mjs').then(mjs => {
  //console.log (`imported shared dform` )
  _formControlState = mjs._formControlState
}, err => {
  console.error (`error importing _formControlState : ${err}`)
  process.exit (1)
})

function genQuery(query, form, parentFieldname) {
  let mquery = {};
  if (query) {
    if (typeof query === "object") {
      for (let qkey in query) {
        if (qkey === "display") {
          // this is the 'display' paremter
        } else if (qkey === "_id") {
          let qfieldid = parentFieldname ? `${parentFieldname}._id` : "_id";
          if (Array.isArray(query._id)) {
            mquery[qfieldid] = {"$in": []};
            for (let i of query._id) {
              try {
                mquery[qfieldid]["$in"].push (new ObjectID(i));
              } catch (e) {
                return {error: `query parameter 'id' doesnt contain a valid objectid : [${i}] (${e}) `}
              }
            }
          } else {
            try {
              mquery[qfieldid] = new ObjectID(query._id);
            } catch (e) {
              return {error: `query parameter 'id' doesnt contain a valid objectid :  [${query._id}] (${e})`}
            }
          }
        } else if (qkey === "p")  {
          let qfieldid = parentFieldname ? `${parentFieldname}.name` : "name";
          // searches field with ->> db.ensureIndex(collectionname, index[, options], callback)
          //db.createIndex(form.collection, {"name": "text"}, { comments: "text" }, function (a,b) {//console.log ("create idx : " + JSON.stringify({a: a, b: b}))});
          //mquery = { "$text": { "$search": query.p}};
          mquery = {[qfieldid]: {$regex: query.p, $options: 'i'}}
        } else if (qkey === "q") {
          let validatedq = {};
          for (let fieldname in query.q) {
            let qfieldid = parentFieldname ? `${parentFieldname}.${fieldname}` : fieldname;
            let fval = query.q[fieldname],
                fdef = form.fields.find(x => x.name === fieldname);
            if (fieldname === "_id")
              // probably query list of _ids, processed on server, already in ObjectID format
              validatedq[qfieldid] = new ObjectID(fval)
            else if (!fdef) {
              // hardwire solution for auth.js find of {"q":{"provider.provider_id":"100002510156619"}}
              let idxdot = fieldname.indexOf ('.');
              if (idxdot > -1) {
                if (!form.fields.find(x => x.name === fieldname.substr(0,idxdot)))
                  return {error: "query object doesnt contains a invalid field :  " + fieldname};
                else
                  validatedq[qfieldid] = fval;
              } else
                return {error: "query object doesnt contains a invalid field :  " + fieldname};
            } else if (fdef.type === "reference") {
              ////console.log ('query got reference with value: ' + JSON.stringify(fval));
              if (fval && fval._id && typeof fval._id === 'string' && fval._id.length === 24) {
                validatedq[qfieldid] = {_id: new ObjectID(fval._id)};
              }
              //if (fval && typeof fval === 'string' && fval.length == 24)
              //  validatedq[qfieldid] = new ObjectID(fval);
            } else
                validatedq[qfieldid] = fval;
          }
          mquery = validatedq;
        } else {
          return {error: "query parameter not recognised : " + qkey};
        }
      }
    } else return {error: "query parameter needs to be an objet"};
  }
  ////console.log (`find(), genquery ${JSON.stringify(query)} ${parentFieldname} : res : ${JSON.stringify(mquery)}`);
  return mquery;
}


// ======================================================================= FIND
async function find(formdef, query, context) {
  return new Promise(function (resolve, reject)  {
    

    ////console.log (`find() formdef: ${JSON.stringify(formdef)},  query: ${JSON.stringify(query)}] with context []`);
    

    /* ------------------------------------------------------------------------
      projectionAndLookups: Search the form meta-data for 'reference' fields that we need to resolve (also search through 'childform' subforms) 
      WARNING: recursive! this function recurses over any childforms for reference and dynamic fields 

      PARAMETERS
        display: 
          what fields to include ('all', 'primary', 'list')
        form:
          the form of the primary record
        parentField:
          if childform
        dynamicField: 

      RETURNS
        projection: 
          https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/
          The fields from the document that we want to return (field list)
        lookups: (field.type === 'reference')
          metaform details of the lookups we will need to resolve 
          result.lookups.concat(child_result.lookups),
        dynamics: (field.type === 'dynamic')
          We only know the field types once we have the data record, so lets mark it now, and do the jexp at harvest time
    */
    function projectionAndLookups (display, form, parentField, dynamicField) {
      ////console.log(`find() projectionAndLookups [display: ${display}] [form: ${form.name}] [parent: ${parentField}] [dynamicField: ${dynamicField}]`);
      var result = {projection: {}, lookups: [], dynamics: []};

      if (parentField) {
        result.projection[`${parentField}._id`] = 1
        if (display === 'all') {
          result.projection[`${parentField}._updateDate`] = 1
          result.projection[`${parentField}._updatedBy`] = 1
        }
      } else {
        // get all system fields on top level collection
        if (form._id === FORM_METADATA_ID) { // && form.store === 'metadata') {
          result.projection["_data"] = 1
        }
        if (display === 'all') {
          result.projection["_createdBy"] = 1
          result.projection["_createDate"] = 1
          result.projection["_updatedBy"] = 1
          result.projection["_updateDate"] = 1
        }
      }

      // instruct find to resolve lookup for "_updatedBy" on top level and childforms (but not dynamicfields)
      if (display === 'all') {
        let v = {reference_field_name: "_updatedBy",search_form_id: MetaFormIds.Users};
        if (parentField) v.parent_field_name = parentField;
        if (dynamicField) v.dynamic_field_name = dynamicField;
        result.lookups.push(v);
      }

      if (form.fields) for (var field of form.fields) {
        ////console.log(`find() projectionAndLookups processing field [${field.name}]`);
        if ((display === 'primary' && field.display !== 'primary') || (display === 'list' && (field.display !== 'primary' && field.display !== 'list'))) {
          ////console.log (`skipping field ${field.name}`);
        } else {

          let fullfieldname = (parentField ? `${parentField}.${field.name}` : field.name);
          // //console.log(`find() projectionAndLookups: ${fullfieldname}`);
          // mongo projections (field list to return)
          if (field.type === 'childform') {
            result.projection[fullfieldname+"._id"] = 1;
          } else if (field.type != "relatedlist") {
            result.projection[fullfieldname] = 1;
          }

          // instruct find to resolve lookup for this reference field by running a subquery
          if (field.type === 'reference') {
            // //console.log('find() projectionAndLookups: found a lookup field on  field : ' + fullfieldname);
            if (display && field.search_form) {
              let v = {reference_field_name: field.name, search_form_id: field.search_form._id};
              if (parentField) v.parent_field_name = parentField;
              if (dynamicField) v.dynamic_field_name = dynamicField;
              result.lookups.push(v);
            }
          } else if (field.type === 'childform') {
              var childform = field.child_form && findForm(field.child_form._id, context)
              if (!childform) {
                  return {error: 'find() Cannot find child_form definitions on field ['+fullfieldname+'] : ' + JSON.stringify(field.child_form)};
              } else {
                  ////console.log('find() projectionAndLookups: found a childform, recurse onit! name :' + field.child_form._id + ' : ' + childform.name);
                  //result = yield projectionAndLookups(childform, fullfieldname, getsystemfields,  result);
                  let child_result = projectionAndLookups(display, childform, fullfieldname, dynamicField);
                  // //console.log (`child_result ${JSON.stringify(child_result)}`);
                  if (child_result.error)
                    return child_result;
                  result = {projection: Object.assign(result.projection, child_result.projection),
                            lookups: result.lookups.concat(child_result.lookups),
                            dynamics: result.dynamics.concat(child_result.dynamics)
                          };
              }
          }  else if (field.type === 'dynamic') {
            // we only know the field types once we have the data record, so lets mark it now, and do the jexp at harvest time!
            // DONE: need to validate dynamic fields & lookup references when dynamic fields are lookups!!
            if (display && field.fieldmeta_el) {
              let v = {reference_field_name: field.name, dynamic_form_ex: field.fieldmeta_el};
              if (parentField) v.parent_field_name = parentField;
              result.dynamics.push(v);
            }
          }
        }
      }
      ////console.log('find() projectionAndLookups: returning result : ' + JSON.stringify(result));
      return result;
    }

    /* ------------------------------------------------------------------------
      processlookupids: Resolve all the 'reference' & 'dynamic' field types from the 'projectionAndLookups' method
      PARAMETERS
        fieldsandlookups: 
          result of the 'projectionAndLookups'
        docs
          the primary document(s) for witch we need to resolve
        subq: 
          if subq is null: 'harvest mode' - extract all the id's from the primary document(s) to run the subqueries
          if subq is specified, update the primary document(s) with the lookup values obtained from the subq

      RETURNS
        if !subq (harvest): {'form_id': {form: <JSON form>, keys: ['id', 'id']}} 
        id subq: docs
    */
    async function processlookupids(fieldsandlookups, docs, subq)  {

        let harvest = !subq,
            processFn = (doc, lookup, lookupkeys, subq) => {  // doc = primary doc, lookup = ?, lookupkeys = (object: key = form, value Sets of Ids to query), 
              let harvest = !subq,
                  fval = lookup.dynamic_field_name  === undefined ? doc[lookup.reference_field_name] : doc[lookup.dynamic_field_name] && doc[lookup.dynamic_field_name][lookup.reference_field_name];

              if (fval) {
                if (harvest) { //--------------------- harvest mode
                  try {
                    ////console.log (`find() processlookupids (harvest) [find: ${lookup.reference_field_name}] [val: ${JSON.stringify(fval)}]`);
                      if (fval._id) {
                        // NEED THIS, as can just compaire === ObjectId, always different, Set doesnt work either!
                        if (lookupkeys[lookup.search_form_id].length === 0 || lookupkeys[lookup.search_form_id].findIndex(k => k.toString() === fval._id.toString()) === -1) {
                          lookupkeys[lookup.search_form_id].push(fval._id); 
                        }
                      } else {
                        fval = {error: `no _id`};
                      }
                  } catch (e) {
                    console.warn (e + ' Warning : lookup value not in format of ObjectId:  field : ' + lookup.reference_field_name + ', val: ' + JSON.stringify(fval));
                  }
                } else { //----------------------------  update mode
                  if (lookup.search_form_id && !fval.error) {
                    let lookupresult = subq[lookup.search_form_id] && subq[lookup.search_form_id][fval._id] || {_id: fval._id, _error:'missing id'};
                    ////console.log (`find() processlookupids (update) [set: ${lookup.reference_field_name}] [val: ${lookupresult.name || lookupresult.error}]`);
                    if (lookup.dynamic_field_name  === undefined)
                      doc[lookup.reference_field_name] = lookupresult;
                    else
                      doc[lookup.dynamic_field_name][lookup.reference_field_name] = lookupresult;
                  }
                }
              }
            };

        var lookupkeys = {};
        for (var doc of docs) { // for each data row

          // ------------------------------------------------------ Look for Lookups in Dynamic fields  - Harvest only
          if (harvest) {
            fieldsandlookups.dynamic_lookups = [];
            for (let d of fieldsandlookups.dynamics) {
              ////console.log (`find() - processlookupids: (harvest) got dynamic [field: ${d.parent_field_name}.${d.reference_field_name}] [${d.dynamic_form_ex}]`);
              let dynamic_fields = null
              if (d.parent_field_name) {
                ////console.log (`find() - processlookupids: (harvest) got dynamic on childform`)
                // TODO - process all records in array!
                if (Array.isArray(doc[d.parent_field_name])) {
                  try {
                    dynamic_fields = await jexl.eval(d.dynamic_form_ex, Object.assign({rec: doc[d.parent_field_name][0] }, context));
                  } catch (err) {
                    console.error (`find() - processlookupids: (harvest) jexl ${d.dynamic_form_ex}`, err)
                  }
                }
              } else {
                // the dynamic field is on top level document
                try {
                  dynamic_fields = await jexl.eval(d.dynamic_form_ex, Object.assign({rec: doc}, context));
                } catch (err) {
                  console.error (`find() - processlookupids: (harvest) jexl ${d.dynamic_form_ex}`, err)
                }
              }
              
              ////console.log (`find() - processlookupids: (harvest) got dynamics result ${JSON.stringify(dynamic_fields, null, 2)}`);
              if (dynamic_fields && dynamic_fields.error) {
                return {error: 'find() error execting dynamic field expression  ['+d.dynamic_form_ex+'] : ' + JSON.stringify(dynamic_fields.error)};
              } else if (dynamic_fields) {
                ////console.log (`find() - processlookupids: (harvest) validate dynamic fields data ${d.reference_field_name} : ${JSON.stringify(dynamic_fields)}`);
                let dynamicfieldsandLookups = projectionAndLookups ('all_no_system', {fields: dynamic_fields}, d.parent_field_name /*parentFieldName */, d.reference_field_name /* dynamicField*/ );
                for (let l of dynamicfieldsandLookups.lookups) {
                  if (harvest && !lookupkeys[l.search_form_id])  lookupkeys[l.search_form_id] = [];
                  if (l.parent_field_name) for (let edoc of doc[l.parent_field_name]) {
                    ////console.log (`find() processlookupids (harvest) : call processFn [dynamic field: ${l.dynamic_field_name}] [fieldname: ${l.reference_field_name}] on ${JSON.stringify(edoc,null,2)}`);
                    processFn(edoc, l, lookupkeys, subq);
                  } else // if field is NOT in an embedded-document, just add id to lookupkeys
                    processFn(doc, l, lookupkeys, subq);
                }
                // ensure these are re-applied in update mode
                fieldsandlookups.dynamic_lookups = fieldsandlookups.dynamic_lookups.concat(dynamicfieldsandLookups.lookups);
                ////console.log ('additional dynamic_lookups ' + fieldsandlookups.dynamic_lookups.length);
              } else {
                console.warn (`find() - processlookupids: (harvest)  eval [${d.dynamic_form_ex}] no results`);
              }
            }
          }

          // ------------------------------------------------------ Lookups (plus any lookups from the dynamic fields above)
          for (let l of harvest ? fieldsandlookups.lookups : fieldsandlookups.lookups.concat(fieldsandlookups.dynamic_lookups)) { // for each 'reference' field from 'projectionAndLookups'
            //if (harvest && !l.search_form_id) continue; // no recorded search form, so dont run subquery
            // if in harvest mode, initialise lookupkeys array
            if (harvest && !lookupkeys[l.search_form_id])  lookupkeys[l.search_form_id] = [];
            ////console.log (`find() processlookupids found lookup [harvest: ${harvest}] [parent: ${l.parent_field_name}] [field: ${l.reference_field_name}]`);
            if (l.parent_field_name && Array.isArray(doc[l.parent_field_name])) for (let edoc of doc[l.parent_field_name]) {
              processFn(edoc, l, lookupkeys, subq);
            } else // if field is NOT in an embedded-document, just add id to lookupkeys
              processFn(doc, l, lookupkeys, subq);
          }

        }
        if (harvest) {

          return lookupkeys;
        } else {
          return docs;
        }
    }

    /* run subquery */
    function runsubquery(display, form, objids, pfld) {
      return new Promise(function (resolve, reject)  {
        let q = { _id: { $in: objids }};
        q.partition_key = context? context.partition_key : 0

        let fieldsandlookups = projectionAndLookups(display, form, null, true);

        ////console.log(`find() runsubquery() find in collection: ${form.collection}, query: ${JSON.stringify(q)}, projection: ${JSON.stringify(fieldsandlookups.projection)}`);
        db.collection(form.collection).find(q, {projection: fieldsandlookups.projection}).toArray(function (err, docs) {
            if (err) reject(err);
            else {

              //process lookupids (fieldsandlookups.lookups, docs, []);
              // if less results than expected and using 'formMeta' lookup to the formMetadata object, include the META_DATA, as there may be a reference.
              // need to call process lookupids in update mode to format the reference fields
              // TODO: Should this be done on the client??

              if (objids.length > docs.length && form._id === FORM_METADATA_ID) {
                let metares = [];
                for (let lid of objids) {
                  if (docs.filter(r => r._id === lid).length == 0)  {
                    // //console.log ('finding in metasearch: ' + lid);
                    let lidform = findForm(lid, context)
                    if (lidform) {
                      let filteredform = {_id: lidform._id};
                      for (let f in fieldsandlookups.projection)
                        filteredform[f] = lidform[f];
                      docs.push (filteredform);
                    }
                  }
                }
              }
              resolve({formid: form._id, records: docs});
            }
        })
      })
    }

    /* flow control - run sub queries in parrallel & call alldonefn(docs) when done! */
    function runallsubqueries(display, lookupkeys) {
      return new Promise(function (resolve, reject)  {
        let subq_res = {};
        if (Object.keys(lookupkeys).length == 0) {
          resolve();
        } else {
          let promises = []
          for (var formid in lookupkeys) {
            let form = findForm(formid, context),
                keys = Array.from(lookupkeys[formid]);

            if (form) {
              if (keys.length >0) {
                if (form.store === "metadata") {
                  ////console.log (`find() runallsubqueries() find in metadata: ${form.name} [_data#=${(form._data? form._data.length : "0")}] [keys: ${JSON.stringify(keys)}] `);
                  subq_res[form._id] = {};
                  if (form._data) for (let key of keys) {
                    let val = form._data.find(i => i._id === key);
                    ////console.log ('find() runallsubqueries, metadata searchform, setting ['+form.name+']['+key+'] : ' + JSON.stringify(val));
                    if (val) subq_res[form._id][key] =  val;
                  }
                } else if (form.store === "mongo") {
                  ////console.log ('find() runallsubqueries, mongo searchform, use form to resolve lookups : ' + form.name);
                  promises.push(runsubquery (display, form, keys));
                } else {
                  subq_res[form._id] = {};
                }
              }
            } else {
              console.error ("ERROR find() runallsubqueries: Cannot access lookup Form definition: " + formid);
            }
          }

          Promise.all(promises).then(function (succVal) {
            ////console.log ('Got all suqqueries, now shape the data: ' + JSON.stringify(succVal));
            for (let subq of succVal) {
              subq_res[subq.formid] = {};
              for (let rec of subq.records) {
                subq_res[subq.formid][rec._id] = rec;
              }
            }
            resolve(subq_res);
          }).catch(function (reason) {
              reject(reason);
          });
        }
      })
    }

    let collection
    //console.log(`------------------  find() [form: ${formdef.form && formdef.form.name}] [query: ${JSON.stringify(query)}]`)

    if (formdef.error || !formdef.form) {
      return reject (`find() formdef parameter error: ${formdef ? formdef.error : 'no formdef'}`)
    }
    if (formdef.form.store ===  'mongo') {
      collection = formdef.form.collection;
      if (formdef.parent)  return reject ("find() cannot supply parent parameter for top level form : " + formdef.form.name);
    } else if (formdef.form.store ===  'fromparent') {
      if (!(formdef.parent && formdef.parent.field && formdef.parent.form && formdef.parent.query))  {
        return reject ("find() got child form, but not complete parent data : " + JSON.stringify(formdef.parent));
      }
      if (!(formdef.parent.field && formdef.parent.field.child_form && formdef.parent.field.child_form._id == formdef.form._id)) {
          return reject ('find() childform not assosiated to parent (check your schema child_form): ' + formdef.parent.field_id);
      }
      collection = formdef.parent.form.collection;
    }

    
    let mquery, findone = query._id && !Array.isArray(query._id);
    if (formdef.parent) {
      mquery = genQuery(formdef.parent.query, formdef.parent.form);
      Object.assign(mquery, genQuery(query, formdef.form, formdef.parent.field.name));
    } else {
      mquery = genQuery(query, formdef.form);
    }
    ////console.log("------------------  find() mongo query : " + JSON.stringify(mquery));
    if (mquery.error) {
      return reject(`query ${mquery.error}`);
    }

    ////console.log(`find() calling projectionAndLookups : ${query.d}`);
    let fieldsandlookups = projectionAndLookups(query.display, formdef.form, formdef.parent && formdef.parent.field.name);

    ////console.log('find() calling projectionAndLookups finished ' + JSON.stringify(fieldsandlookups)); // + JSON.stringify(fieldsandlookups));
    if (fieldsandlookups.error) {
      reject(fieldsandlookups.error)
    } else {

      function retfn (err, doc) {
        
        if (err ) {
          console.warn('find() find ERROR :  ' + err);
          reject (err);
        } else if ((findone && doc == null) || (!findone && doc.length == 0)) {
          console.warn("find() no records retuned") // ' + JSON.stringify(doc));
          return resolve(doc);
        } else {

          ////console.log("find() got records"); // ' + JSON.stringify(doc));

            // finding all forms, so return our hardwired also
            /* - ERROR - this code mutates doc!!!
            //console.log ('debug: ' + form._id + " === " + exps.forms["metaSearch"]);
            if (Object.is(form._id,exps.forms["metaSearch"])) {
              if (!findone) {
                doc = doc.concat( FORM_DATA) ;
              }
            }
            */
            if (!query.display) {
              ////console.log ('find() no display, so ignore Lookups, so just return');
              // need to call process lookupids in update mode to format the reference fields
              // process lookupids (fieldsandlookups.lookups, findone && [doc] || doc, []);
              return resolve(doc);
            } else {
              processlookupids(fieldsandlookups, findone && [doc] || doc).then(lookupkeys => {
                ////console.log("find() got query for foriegn key lookup, now run subqueries"); // + JSON.stringify(lookupkeys));

                runallsubqueries('primary', lookupkeys).then(function (succVal) {
                  if (succVal) {
                    // //console.log("find() runallsubqueries success, now process lookupids, recs:" + (findone && "1" || doc.length));
                    processlookupids (fieldsandlookups, findone && [doc] || doc, succVal).then(() => resolve(doc));
                  } else
                    return resolve(doc);
                }, function (errVal) {
                  console.error("find() runallsubqueries error " + errVal);
                  return reject(errVal)
                }).catch(function error(e) {
                  console.error ("find() catch runallsubqueries err : " + e);
                  return reject(e);
                });
              }, (errVal) => {
                console.error("find() processlookupids error " + errVal);
                return reject(errVal);
              }).catch((e) => {
                console.error ("find() catch processlookupids err : " + e);
                return reject(e);
              });
            }
        }
      };

      // its find one, DOESNT RETURN A CURSOR
      mquery.partition_key = context? context.partition_key : 0
      if (findone) {
        ////console.log(`find() findOne in [collection: ${collection}] [query:  ${JSON.stringify(mquery)}, projection: ${JSON.stringify(fieldsandlookups.projection)}]`);
        db.collection(collection).findOne(mquery, {projection: fieldsandlookups.projection}, retfn)
      } else {
        ////console.log(`find() find in collection: ${collection} [query:  ${JSON.stringify(mquery)}, projection: ${JSON.stringify(fieldsandlookups.projection)}]]`);
        db.collection(collection).find(mquery, {projection: fieldsandlookups.projection}).toArray(retfn)
      }
    }
  }).catch(function (err) {
    console.error (`find() catch program error: ${err}`);
    return Promise.reject (`find() catch program Error: ${err}`);
  })
}

async function remove (formdef, query, context) {
  return new Promise(function (resolve, reject)  {

    let collection

    if (formdef.error || !formdef.form) {
      return reject (`delete() formdef parameter error: ${formdef && formdef.error || 'no formdef'}`);
    }
    if (formdef.form.store ===  'mongo') {
      collection = formdef.form.collection;
      if (formdef.parent)  return reject ("delete() cannot supply parent parameter for top level form : " + formdef.form.name);
    } else if (formdef.form.store ===  'fromparent') {

      if (!(formdef.parent && formdef.parent.field && formdef.parent.form && formdef.parent.query))  {
        return reject ("delete() got child form, but not complete parent data : " + JSON.stringify(formdef.parent));
      }
      if (!(formdef.parent.field && formdef.parent.field.child_form && formdef.parent.field.child_form._id == formdef.form._id)) {
          return reject ('delete() childform not assosiated to parent (check your schema child_form): ' + formdef.parent.field_id);
      }
      collection = formdef.parent.form.collection;
    }

    let mquery, update;
    if (formdef.parent) {
      mquery = genQuery(formdef.parent.query, formdef.parent.form);
      update = { $pull: { [formdef.parent.field.name]: genQuery(query, formdef.form) } };
      if (mquery.error) return reject(mquery.error);

      ////console.log(`delete() <${collection}>  query:  ${JSON.stringify(mquery)}, update: ${JSON.stringify(update)}`);
      mquery.partition_key = context? context.partition_key : 0
      db.collection(collection).updateOne(mquery, update, function (err, out) {
        ////console.log (`delete() update ${JSON.stringify(out)} err: ${err}`);
        if (err) {
            return reject (err); // {'ok': #recs_proceses, 'n': #recs_inserted, 'nModified': #recs_updated}
        } else if (out.nModified === 0) {
          return reject ("nothing deleted");
        } else {
          return resolve ({'deleted': true});
        }
      });
    } else {
      mquery = genQuery(query, formdef.form);
      ////console.log(`delete() <${collection}>  query:  ${JSON.stringify(mquery)}`)
      mquery.partition_key = context? context.partition_key : 0
      db.collection(collection).remove(mquery, function (err, out) {
        ////console.log (`delete() update ${JSON.stringify(out)} err: ${err}`);
        if (err) {
            return reject (err); // {'ok': #recs_proceses, 'n': #recs_inserted, 'nModified': #recs_updated}
        } else if (out.nModified === 0) {
          return reject ("nothing deleted");
        } else {
          return resolve ({'deleted': true});
        }
      });
    }
  }).catch(function (err) {
    console.error (`delete() catch program error: ${err}`);
    return Promise.reject (`delete() catch program Error: ${err}`);
  });
}

async function save (formdef, userdoc, context) {
  //return new Promise( async function(resolve, reject)  {

    let collection
    //console.log (`------------------  save() with formdef : ${formdef.form.name}, context: ${context && context.app && context.app.name}`);

    if (formdef.error || !formdef.form) {
      return Promise.reject (`save() formdef parameter error: ${formdef && formdef.error || 'no formdef'}`);
    }
    if (formdef.form.store ===  'mongo') {
      collection = formdef.form.collection;
      if (formdef.parent)  return Promise.reject ("save() cannot supply parent parameter for top level form : " + formdef.form.name);
    } else if (formdef.form.store ===  'fromparent') {

      if (!(formdef.parent && formdef.parent.field && formdef.parent.form && formdef.parent.query))  {
        return Promise.reject ("save() got child form, but not complete parent data : " + JSON.stringify(formdef.parent));
      }
      if (!(formdef.parent.field && formdef.parent.field.child_form && String(formdef.parent.field.child_form._id) === String(formdef.form._id))) {
          return Promise.reject ('save() childform not assosiated to parent (check your schema child_form): ' + formdef.parent.field_id);
      }
      
      collection = formdef.parent.form.collection;
    }

    const isArray = Array.isArray (userdoc),
          isInsert = formdef.form.store === 'metadata'? false : isArray || typeof userdoc._id === 'undefined'

    // //console.log('save() collection: '+collection+' userdoc: ' + JSON.stringify(userdoc));
    // build the field set based on metadata - NOT the passed in JSON!
    // 'allowchildform'  if its a INSERT of a TOP LEVEL form, allow a childform to be passed in (used by auth.js)
    async function validateSetFields (isInsert, form, userdoc, embedField, allowchildform, existing_rec, parent_rec) {
    
      var recs = !isArray? [userdoc]: userdoc,
          mongo_recs = []

      for (let rec of recs) {
        let mongo_rec = {};  // target validated object

          if (isInsert) {
            // generate new ID.
            mongo_rec._id = new ObjectID();
            mongo_rec.partition_key = context? context.partition_key : 0
            mongo_rec['_createDate'] = new Date();
            mongo_rec['_createdBy'] = context && context.user && {_id: new ObjectID(context.user._id)};
          } else { // update
            // if updating, data doesn't need new _id.
            if (!rec._id) return {error: "data doesnt contain key (_id)"}
          }

          if (formdef.form.store !== 'metadata') {
            // metadata fields doesnt update
            mongo_rec[!isInsert && embedField? `${embedField}.$._updateDate` : '_updateDate'] = new Date();
            mongo_rec[!isInsert && embedField? `${embedField}.$._updatedBy` : '_updatedBy'] = context && context.user && {_id: new ObjectID(context.user._id)};
          }
          ////console.log (`save(): validateSetFields(), calling _formControlState`)
        
          const {formctl} = await _formControlState (context, 2, form, existing_rec, rec, parent_rec, undefined, ObjectID)

          for (let rec_key in rec) {
            ////console.log ("save(): validateSetFields(), checking : " + rec_key)
            
            if (rec_key === "_id") {
              if (isInsert) {
                // Keys are user generated for metadata records
                return {error: "Insert request, cannot contain existing key (_id) : " + rec[rec_key]}
              } else {
                ////console.log (`validateSetFields(): validating record _id : ${rec[rec_key]}`)
                if (formdef.form.store === 'metadata') {
                  // metadata data has user-defined IDs!
                  mongo_rec._id = rec[rec_key]
                }
              }
            } else {
              
              // for all other fields
              const fldctl = formctl.flds[rec_key]
              if (!fldctl) {
                return {error: `Field ${rec_key}, not defined`}
              } else if ('error' in fldctl) {
                return fldctl
              } else if ('validated_value' in fldctl) {

                const fld = form.fields.find(f => f.name === rec_key)
                const mongo_key = !isInsert && embedField? `${embedField}.$.${rec_key}` : rec_key

                if (fld.type === "dynamic") {
                  
                  let d_mongo_rec = {};  // target validated object
                  for (let d_rec_key in fldctl.validated_value) {

                    const fldctl = formctl.flds[rec_key].flds[d_rec_key]
                    if (!fldctl) {
                      return {error: `Dynamic field ${rec_key}.${d_rec_key}, not defined`}
                    } else if ('error' in fldctl) {
                      return fldctl
                    } if ('validated_value' in fldctl) {
                      d_mongo_rec[d_rec_key] = fldctl.validated_value
                    }
                  }
                  mongo_rec[mongo_key] = d_mongo_rec

                } else if (fld.type === "childform") {
                  ////console.log (`save(): validateSetFields(), value is a childform: ${fld.name}`)
                    // We should allow for embedded childform data, as full documents can be saved including childforms (for example when saving a new user with the 'provider' childform)
                  if (!allowchildform) {
                    //continue; // just ignore the childform data!
                    return {error: "data contains childform field, not allowed in this mode: " + rec_key};
                  } else {
                    const mongo_child_recs = []
                    const cform = findForm(fld.child_form._id, context)
                    
                    if (!cform) return {error: "data contains childform field, but no child_form defined for the field: " + fld.name}

                    for (let c_rec of fldctl.validated_value) {
                    
                      if (c_rec._id) return {error: `data contains embedded childform field [${fld.name}] containing data with existing _id`}
                      const c_mongo_rec = {_id: new ObjectID()}  // new target validated object
                      
                      const {formctl} = await _formControlState (context, 2, cform, undefined, c_rec, undefined, undefined, ObjectID)

                      for (let c_rec_key in c_rec) {
                        const c_fldctl = formctl.flds[c_rec_key]
                        if (!c_fldctl) {
                          return {error: `Field ${c_rec_key}, not defined`}
                        } else if ('error' in c_fldctl) {
                          return c_fldctl
                        } if ('validated_value' in c_fldctl) {

                          const cfld = cform.fields.find(f => f.name === c_rec_key)
        
                          if (cfld.type === "dynamic") {
                            
                            let d_mongo_rec = {};  // target validated object
                            for (let d_rec_key in fldctl.validated_value) {
        
                              const fldctl = formctl.flds[c_rec_key].flds[d_rec_key]
                              if (!fldctl) {
                                return {error: `Dynamic field ${c_rec_key}.${d_rec_key}, not defined`}
                              } else if ('error' in fldctl) {
                                return fldctl
                              } if ('validated_value' in fldctl) {
                                d_mongo_rec[d_rec_key] = fldctl.validated_value
                              }
                            }
                            c_mongo_rec[c_rec_key] = d_mongo_rec
        
                          } else if (cfld.type === "childform") {
                            return {error: "data contains childform field, not allowed in this mode: " + c_rec_key}
                          } else {
                            c_mongo_rec[c_rec_key] = c_fldctl.validated_value
                          }
                        }
                      }
                      mongo_child_recs.push(c_mongo_rec)
                    }
                    mongo_rec[mongo_key] = mongo_child_recs
                  }
  
                } else {
                  mongo_rec[mongo_key] = fldctl.validated_value;
                } 
              } else {
                console.warn (`not output ${rec_key}`)
              }
            }
          }
        mongo_recs.push (mongo_rec)
      }
      return {data: !isArray? mongo_recs[0]: mongo_recs}
    }

    if (formdef.parent) {
      ////console.log (`save() Its a embedded doc, so read the existing parent record, so its aviable for any validity expressions`)
      try {
        const existing_rec = await find ({form: formdef.parent.form}, {_id: formdef.parent.query._id, display: 'all_no_system'}, context)
        if (!existing_rec) {
          return Promise.reject ("save() existing top-level doc not found")
        } else {
          let existing_ed
          if (!isInsert) {
            ////console.log (`save() Its a embedded doc update, so get the existing embedded doc`)
            existing_ed = existing_rec[formdef.parent.field.name].find(ed => new ObjectID(userdoc._id).equals(ed._id))
            if (!existing_ed) return Promise.reject ("save() existing embedded doc not found")
          }
          try {
            const validatedUpdates = await validateSetFields(isInsert, formdef.form, userdoc, formdef.parent.field.name, false, existing_ed, existing_rec)

            if (validatedUpdates.error)
              return Promise.reject (validatedUpdates.error);
            else {
              let query = {_id: ObjectID(formdef.parent.query._id), partition_key: context? context.partition_key : 0}, update

              /***** TRYING TO DO EMBEDDED ARRAY inside EMBEDDED ARRAY, BUT MONGO DOESNT SUPPORT NESTED POSITIONAL OPERATORS
              var embedsplit = formdef.parent.field.name.split('.');
                if (embedsplit.length == 2) {
                  query['"' + embedsplit[0] + '._id"'] = new ObjectID(parent.record_id);
              }  else {
                  query = {_id: new ObjectID(parent.record_id)};
              }
              */

              if (!isInsert) {
                update = {'$set': validatedUpdates.data}
                query[`${formdef.parent.field.name}._id`] =  ObjectID(userdoc._id)
              } else {
                if (!isArray) {
                  update = {'$push': { [formdef.parent.field.name]: validatedUpdates.data}}
                } else {
                  update = {'$push': { [formdef.parent.field.name]: { '$each': validatedUpdates.data}}}
                }
              }
                
              try {
                ////console.log(`save() update [collection: ${collection}] [query: ${JSON.stringify(query)}] update: ${JSON.stringify(update)}`)
                const result = await db.collection(collection).updateOne(query, update)

                ////console.log ('save() result : ' + JSON.stringify(result))
                if (result.nModified === 0) {
                  return Promise.reject (`save() no update made: ${JSON.stringify(query)}`);
                } else {
                  return Promise.resolve ({_id: isInsert ? update['$push'][formdef.parent.field.name]._id : query[formdef.parent.field.name+"._id"]})
                }
              } catch (e) {
                return Promise.reject (`save() updateOne failed data : ${JSON.stringify(e)}`)
              }
            }
          } catch (e) {
            return Promise.reject (`save() error validating data : ${JSON.stringify(e)}`)
          }
        } 
      } catch (e) {
        return Promise.reject (`save() error retrieving existing top-level doc : ${JSON.stringify(e)}`)
      }
    } else {
      if (!isInsert) {
        try {
          ////console.log (`save() Its a top-level _update_, read the existing record - ${formdef.form.name}`)

          var existing_rec
          if (formdef.form.store !== 'metadata') { // if its metadata, existing recs (_data) are not relevent, as its always a straight update of _data
            existing_rec = await find (formdef, {_id: ObjectID(userdoc._id), display: 'all_no_system'}, context)
            if (!existing_rec) {
              return Promise.reject ("save() existing doc not found")
            }
          }

          try {
            const validatedUpdates = await validateSetFields(isInsert, formdef.form, userdoc, null, false, existing_rec)

            if (validatedUpdates.error)
              return Promise.reject (validatedUpdates.error)
            else {
              var update = { '$set': validatedUpdates.data },
                    query = {_id:  ObjectID(userdoc._id), partition_key: context? context.partition_key : 0}

              if (formdef.form.store === 'metadata') {
                update = { '$set': {'_data': validatedUpdates.data}}
                query = {_id:  formdef.form._id, partition_key: context? context.partition_key : 0}
                collection = MetaFormsById[String(MetaFormIds.formMetadata)].collection
              }

              try {
                ////console.log(`save() updateOne [collection: ${collection}] [query: ${JSON.stringify(query)}] update: ${JSON.stringify(update)}`);
                const result = await db.collection(collection).updateOne (query, update)

                ////console.log ('save() res : ' + JSON.stringify(result))
                if (result.nModified === 0) {
                  return Promise.reject (`no update made ${JSON.stringify(query)}`);
                } else {
                  return Promise.resolve ({_id: query._id});
                }
              } catch (e) {
                return Promise.reject (`save() updateOne failed data : ${JSON.stringify(e)}`)
              }
            }
          } catch (e) {
            return Promise.reject (`save() error validating data : ${JSON.stringify(e)}`)
          }
          
        } catch (e) {
          return Promise.reject (`save() error retrieving existing top-level doc : ${JSON.stringify(e)}`)
        }
      } else {
        ////console.log (`save() Its a top-level doc _insert_`)

        try {
          const validatedUpdates = await validateSetFields(isInsert, formdef.form, userdoc, null, true)

          if (validatedUpdates.error)
            return Promise.reject (validatedUpdates.error)
          else {
            const insert = validatedUpdates.data

            ////console.log(`save():  insert <${collection}>: insert: ${JSON.stringify(insert)}`);
            if (!isArray) {
              try {
                const result = await db.collection(collection).insertOne (insert)
                ////console.log ('save() res : ' + JSON.stringify(result))
                
                // COSMOSDB SPECIFIC CODE UGH!
                if (formdef.form._id === FORM_METADATA_ID && insert.store === "mongo") {
                  ////console.log(`save():  Inserted a new formMetadata mongo collection`)
                  try {
                    await db.command({ shardCollection: `${dbname}.${insert.collection}`, key: { partition_key:  "hashed" }})
                    return Promise.resolve ({_id: insert._id});
                    
                  } catch (err) {
                      return Promise.reject (err);
                  }
                } else {
                  return Promise.resolve  ({_id: insert._id});
                }
                
              } catch (e) {
                return Promise.reject (`save() insertOne failed data : ${JSON.stringify(e)}`)
              }
            } else {
              try {
                const result = await db.collection(collection).insertMany (insert)
                ////console.log (`save() res : ${JSON.stringify(result)}`)
                // {'ok': #recs_proceses, 'n': #recs_inserted, 'nModified': #recs_updated}
                return Promise.resolve (result)
              } catch (e) {
                return Promise.reject (`save() insertMany failed data : ${JSON.stringify(e)}`)
              }
            }
          }
        } catch (e) {
          return Promise.reject (`save() error validating data : ${JSON.stringify(e)}`)
        }
      }
    }
}

jexl.addTransform('getForm', function(formid, context) {
  //console.log (`jexl.Transform  getForm [form id: ${formid}]`);
  // TODO : needs to Find a way of making 'context' available to Transform function!!!
  let form = findForm(formid, context)
  return form || Promise.reject(`formid not found ${formid}`)
})

jexl.addTransform('getFormId', function(ids, formid, context) {
  //console.log (`jexl.Transform  [id:${ids}] [form name: ${formid}]`);
  // TODO : needs to Find a way of making 'context' available to Transform function!!!
  let form = findForm(formid, context)
  if (form) {
    //console.log (`jexl.Transform get [name : ${form.name} ${form.store}] finding [_id:  ${ids}]`);
    if (ids) {
      if (form.store === 'mongo')
        return find({form}, {_id:ids, display: 'all_no_system'}, context);
      else if (form.store === 'metadata') {
        //console.log (`jexl.Transform get metadata ${form._data.length}`)
        return form._data.find(m => m._id === ids)
      }
    } else
      return Promise.resolve();
  } else
    return Promise.reject(`formid not found ${formid}`)
})

jexl.addTransform('getFormName', function(ids, fname, context) {
  //console.log (`jexl.Transform getFormName [id:${ids}] [form name: ${fname}] [context forms : ${context && context.appMeta && context.appMeta.map(f => f.name)}]`);
  // TODO : needs to Find a way of making 'context' available to Transform function!!!
  
  let form = findFormByName(fname, context)
  if (form) {
    //console.log (`jexl.Transform get [name : ${form.name} ${form.store}] finding [_id:  ${ids}]`);
    if (ids) {
      if (form.store === 'mongo')
        return find({form}, {_id:ids, display: 'all_no_system'}, context);
      else if (form.store === 'metadata') {
        //console.log (`jexl.Transform get metadata ${form._data.length}`)
        return form._data.find(m => m._id === ids)
      }
    } else
      return Promise.resolve();
  } else
    return Promise.reject(`form name not found ${fname}`)
})



module.exports = {
    find,
    save,
    remove
  }



